/**
 * CommunityService - Community Forum and Social Features
 * From Report: UC-C2.1 Community Interaction, UC-C2.2 Community Follow-Up
 * Implements C1/C2 Warm Company module
 */

import prisma from '../utils/prisma';

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  type: 'story' | 'question' | 'tip' | 'achievement' | 'support';
  title: string;
  content: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isPublished: boolean;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      diabetesType: string;
    };
  };
  comments?: Comment[];
  likes?: Like[];
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  content: string;
  parentId?: string;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
  author?: {
    id: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface CommunityStats {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  activeUsers: number;
  popularTags: Array<{ tag: string; count: number }>;
  recentActivity: Array<{
    type: 'post' | 'comment' | 'like';
    userId: string;
    authorName: string;
    content: string;
    timestamp: Date;
  }>;
}

export class CommunityService {

  /**
   * Create a new post
   */
  static async createPost(data: {
    userId: string;
    type: 'story' | 'question' | 'tip' | 'achievement' | 'support';
    title: string;
    content: string;
    tags: string[];
    isAnonymous?: boolean;
  }): Promise<Post> {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { profile: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const authorName = data.isAnonymous 
      ? `Anonymous User ${user.id.slice(-4)}`
      : `${user.profile?.firstName || 'User'} ${user.profile?.lastName || ''}`.trim();

    const post = await prisma.post.create({
      data: {
        userId: data.userId,
        authorName,
        type: data.type,
        title: data.title,
        content: data.content,
        tags: JSON.stringify(data.tags),
        isPublished: true,
      },
    });

    return this.mapToPostModel(post, user);
  }

  /**
   * Get posts with pagination and filtering
   */
  static async getPosts(options: {
    page?: number;
    limit?: number;
    type?: string;
    tags?: string[];
    userId?: string;
    search?: string;
    sortBy?: 'newest' | 'popular' | 'trending';
  } = {}): Promise<{ posts: Post[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {
      isPublished: true,
    };

    if (options.type) {
      where.type = options.type;
    }

    if (options.tags && options.tags.length > 0) {
      where.tags = {
        contains: options.tags[0], // Simple tag filtering
      };
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.search) {
      where.OR = [
        { title: { contains: options.search } },
        { content: { contains: options.search } },
      ];
    }

    const orderBy: any = {};
    switch (options.sortBy) {
      case 'popular':
        orderBy.likesCount = 'desc';
        break;
      case 'trending':
        // Simple trending: recent posts with high engagement
        orderBy.createdAt = 'desc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          user: {
            include: { profile: true },
          },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { include: { profile: true } },
            },
          },
          likes: true,
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      posts: posts.map(post => this.mapToPostModel(post, post.user)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single post with comments
   */
  static async getPost(postId: string): Promise<Post | null> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          include: { profile: true },
        },
        comments: {
          include: {
            user: { include: { profile: true } },
            replies: {
              include: {
                user: { include: { profile: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        likes: true,
      },
    });

    if (!post) return null;

    return this.mapToPostModel(post, post.user);
  }

  /**
   * Add comment to post
   */
  static async addComment(data: {
    postId: string;
    userId: string;
    content: string;
    parentId?: string;
    isAnonymous?: boolean;
  }): Promise<Comment> {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { profile: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const authorName = data.isAnonymous 
      ? `Anonymous User ${user.id.slice(-4)}`
      : `${user.profile?.firstName || 'User'} ${user.profile?.lastName || ''}`.trim();

    const comment = await prisma.comment.create({
      data: {
        postId: data.postId,
        userId: data.userId,
        authorName,
        content: data.content,
        parentId: data.parentId,
      },
    });

    // Update post comment count
    await prisma.post.update({
      where: { id: data.postId },
      data: {
        commentsCount: {
          increment: 1,
        },
      },
    });

    return this.mapToCommentModel(comment, user);
  }

  /**
   * Like/unlike a post
   */
  static async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      await prisma.post.update({
        where: { id: postId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
      });

      const updatedPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { likesCount: true },
      });

      return {
        liked: false,
        likesCount: updatedPost?.likesCount || 0,
      };
    } else {
      // Like
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      });

      await prisma.post.update({
        where: { id: postId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      });

      const updatedPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { likesCount: true },
      });

      return {
        liked: true,
        likesCount: updatedPost?.likesCount || 0,
      };
    }
  }

  /**
   * Get community statistics
   */
  static async getCommunityStats(): Promise<CommunityStats> {
    const [
      totalPosts,
      totalComments,
      totalLikes,
      activeUsers,
      popularTags,
      recentActivity,
    ] = await Promise.all([
      prisma.post.count({ where: { isPublished: true } }),
      prisma.comment.count(),
      prisma.like.count(),
      prisma.user.count({
        where: {
          OR: [
            { posts: { some: {} } },
            { comments: { some: {} } },
            { likes: { some: {} } },
          ],
        },
      }),
      this.getPopularTags(),
      this.getRecentActivity(),
    ]);

    return {
      totalPosts,
      totalComments,
      totalLikes,
      activeUsers,
      popularTags,
      recentActivity,
    };
  }

  /**
   * Get popular tags
   */
  private static async getPopularTags(): Promise<Array<{ tag: string; count: number }>> {
    const posts = await prisma.post.findMany({
      where: { isPublished: true },
      select: { tags: true },
    });

    const tagCounts: { [key: string]: number } = {};
    
    posts.forEach(post => {
      const tags = JSON.parse(post.tags);
      tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get recent community activity
   */
  private static async getRecentActivity(): Promise<Array<{
    type: 'post' | 'comment' | 'like';
    userId: string;
    authorName: string;
    content: string;
    timestamp: Date;
  }>> {
    const [recentPosts, recentComments] = await Promise.all([
      prisma.post.findMany({
        where: { isPublished: true },
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.comment.findMany({
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const activity = [
      ...recentPosts.map(post => ({
        type: 'post' as const,
        userId: post.userId,
        authorName: post.authorName,
        content: post.title,
        timestamp: post.createdAt,
      })),
      ...recentComments.map(comment => ({
        type: 'comment' as const,
        userId: comment.userId,
        authorName: comment.authorName,
        content: comment.content.slice(0, 100) + (comment.content.length > 100 ? '...' : ''),
        timestamp: comment.createdAt,
      })),
    ];

    return activity
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  /**
   * Map database post to model
   */
  private static mapToPostModel(post: any, user: any): Post {
    return {
      id: post.id,
      userId: post.userId,
      authorName: post.authorName,
      type: post.type,
      title: post.title,
      content: post.content,
      tags: JSON.parse(post.tags),
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      isPublished: post.isPublished,
      isAnonymous: post.authorName.includes('Anonymous'),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: user ? {
        id: user.id,
        email: user.email,
        profile: user.profile ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          diabetesType: user.profile.diabetesType,
        } : undefined,
      } : undefined,
      comments: post.comments?.map((comment: any) => this.mapToCommentModel(comment, comment.user)),
      likes: post.likes?.map((like: any) => ({
        id: like.id,
        postId: like.postId,
        userId: like.userId,
        createdAt: like.createdAt,
      })),
    };
  }

  /**
   * Map database comment to model
   */
  private static mapToCommentModel(comment: any, user: any): Comment {
    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      authorName: comment.authorName,
      content: comment.content,
      parentId: comment.parentId,
      isAnonymous: comment.authorName.includes('Anonymous'),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: user ? {
        id: user.id,
        profile: user.profile ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
        } : undefined,
      } : undefined,
      replies: comment.replies?.map((reply: any) => this.mapToCommentModel(reply, reply.user)),
    };
  }
}
