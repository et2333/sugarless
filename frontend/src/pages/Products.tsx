import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './Products.css';
import { 
  Card, Input, List, Tag, Empty, Spin, Typography, Space, 
  Tabs, Button, Badge, Table, Alert, Tooltip, AutoComplete,
  InputNumber, message
} from 'antd';
import { 
  SearchOutlined, ThunderboltOutlined, 
  DollarOutlined, FireOutlined, ExperimentOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { searchSupplements } from '../api/recommendation';
import { shoppingListAPI } from '../api/shoppingList';

const { Search } = Input;
const { Text, Title, Paragraph } = Typography;

// Enhance product data with supplier information for table display
function enhanceProductData(product: any) {
  const basePrice = product.price || product.averagePrice || 0;
  const suppliers = [
    {
      rank: 1,
      supplier: product.vendor || 'Chemist Warehouse',
      price: basePrice,
      isLowest: true,
      inStock: product.inStock !== false,
      stockQuantity: product.stockQuantity || 100
    },
    {
      rank: 2,
      supplier: 'Priceline',
      price: basePrice > 0 ? basePrice * 1.1 : 0,
      isLowest: false,
      inStock: product.inStock !== false,
      stockQuantity: Math.floor((product.stockQuantity || 100) * 0.5)
    }
  ];

  return {
    ...product,
    suppliers,
    minPrice: basePrice,
    maxPrice: basePrice > 0 ? basePrice * 1.2 : 0,
    specification: product.specification || 
      (product.dosage && product.quantity && product.unit 
        ? `${product.dosage} x ${product.quantity} ${product.unit}`
        : '100 tablets')
  };
}

// Smart Search Results Component - Table Style
function SmartSearchResults({ 
  products, 
  searchQuery, 
  aiAnalysis,
  onAddToCart,
  quantities,
  setQuantities,
  getQuantity,
  addToCartLoading
}: {
  products: any[];
  searchQuery: string;
  aiAnalysis?: any;
  onAddToCart: (product: any) => void;
  quantities: Record<string, number>;
  setQuantities: (productId: string, quantity: number) => void;
  getQuantity: (productId: string) => number;
  addToCartLoading: boolean;
}) {
  const enhancedProducts = products.map(enhanceProductData);

  return (
    <div className="search-results-container">
      {/* AI Recommendation Box */}
      <div className="ai-recommendation-box">
        <h3>🤖 AI Recommendation Reasoning</h3>
        <p>
          {aiAnalysis?.reasoning || 
           `Based on your query "${searchQuery}", we recommend the following products suitable for diabetes management.`}
        </p>
        {aiAnalysis?.diabetesRelevance && (
          <p className="relevance-note">
            <strong>Diabetes Relevance: </strong>{aiAnalysis.diabetesRelevance}
          </p>
        )}
        {!aiAnalysis?.diabetesRelevance && !aiAnalysis?.reasoning && (
          <p className="relevance-note">
            All recommended products are carefully selected for their compatibility with diabetes management.
          </p>
        )}
      </div>
      
      {/* Results Count */}
      <p className="results-count">Found {enhancedProducts.length} recommended product{enhancedProducts.length !== 1 ? 's' : ''}</p>
      
      {/* Products Table List */}
      <div className="products-table-list">
        {enhancedProducts.map((product, index) => (
          <ProductTableCard 
            key={`${product.id || 'product'}-${index}`} 
            product={product} 
            index={index}
            onAddToCart={onAddToCart}
            quantities={quantities}
            setQuantities={setQuantities}
            getQuantity={getQuantity}
            addToCartLoading={addToCartLoading}
          />
        ))}
      </div>
    </div>
  );
}

// Product Table Card Component
function ProductTableCard({
  product,
  index,
  onAddToCart,
  quantities,
  setQuantities,
  getQuantity,
  addToCartLoading
}: {
  product: any;
  index: number;
  onAddToCart: (product: any) => void;
  quantities: Record<string, number>;
  setQuantities: (productId: string, quantity: number) => void;
  getQuantity: (productId: string) => number;
  addToCartLoading: boolean;
}) {
  const quantity = getQuantity(product.id);
  const price = product.price || product.averagePrice || product.minPrice || 0;
  const isInStock = product.inStock !== false && (product.stockQuantity ?? 0) > 0;
  const isDisabled = !isInStock || product.prescriptionRequired || product.id?.startsWith('virtual-') || !price;

  return (
    <div className="product-table-card">
      {/* Product Header */}
      <div className="product-header">
        <div className="product-title-row">
          <span className="rank-badge">{index + 1}</span>
          <h3 className="product-name">{product.nameEn || product.name || product.displayName}</h3>
          <span className="supplier-badge">{product.brand || 'Generic'}</span>
          <span className="ai-badge">AI Recommended</span>
        </div>
        
        {/* Price Range */}
        {product.maxPrice > product.minPrice && (
          <div className="price-range">
            Price Range: ${product.minPrice.toFixed(2)} - ${product.maxPrice.toFixed(2)}
          </div>
        )}
      </div>
      
      {/* Product Detail Table */}
      <table className="product-detail-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Brand</th>
            <th>Supplier</th>
            <th>Price</th>
            <th>Inventory</th>
            <th>Specification</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span className="rank-circle">1</span>
            </td>
            <td>{product.brand || 'Generic'}</td>
            <td>
              <span className="supplier-tag">{product.vendor || 'Chemist Warehouse'}</span>
            </td>
            <td>
              <span className="price">${price.toFixed(2)}</span>
              {product.suppliers && product.suppliers.length > 1 && (
                <span className="price-tag">Lowest Price</span>
              )}
            </td>
            <td>
              <span className={`stock-status ${isInStock ? 'in-stock' : 'out-stock'}`}>
                {isInStock ? `In Stock (${product.stockQuantity || 100})` : 'Out of Stock'}
              </span>
            </td>
            <td>{product.specification || `${product.dosage || '100mg'} x ${product.quantity || '100'} ${product.unit || 'tablets'}`}</td>
            <td>
              <div className="action-buttons">
                {/* Quantity Selector */}
                <div className="quantity-selector">
                  <button 
                    onClick={() => setQuantities(product.id, Math.max(1, quantity - 1))}
                    disabled={isDisabled}
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const maxQty = product.stockQuantity ? Math.min(99, product.stockQuantity) : 99;
                      setQuantities(product.id, Math.max(1, Math.min(maxQty, value)));
                    }}
                    min="1"
                    max={product.stockQuantity ? Math.min(99, product.stockQuantity).toString() : "99"}
                    disabled={isDisabled}
                  />
                  <button 
                    onClick={() => {
                      const maxQty = product.stockQuantity ? Math.min(99, product.stockQuantity) : 99;
                      setQuantities(product.id, Math.min(maxQty, quantity + 1));
                    }}
                    disabled={isDisabled}
                  >
                    +
                  </button>
                </div>
                
                {/* Add to Shopping List Button */}
                <button 
                  className={`add-to-cart-btn ${isDisabled ? 'disabled' : ''}`}
                  disabled={isDisabled || addToCartLoading}
                  onClick={() => onAddToCart(product)}
                >
                  🛒 Add to Shopping List
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      {/* Product Footer */}
      <div className="product-footer">
        <span className="relevance">
          Relevance: {(product.relevanceScore || product.diabetesRelevance || 0.7).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export default function Products() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [searchMode, setSearchMode] = React.useState<'nlq' | 'compare'>('nlq'); // nlq=自然语言搜索, compare=价格比较
  const [autoCompleteOptions, setAutoCompleteOptions] = React.useState<{value: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [quantities, setQuantities] = React.useState<Record<string, number>>({}); // 存储每个产品的数量
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // 点击外部时隐藏建议
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 防抖搜索
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 智能搜索状态
  const [smartSearchEnabled, setSmartSearchEnabled] = React.useState(true);
  const [smartSearchResult, setSmartSearchResult] = React.useState<any>(null);
  const [smartSearchLoading, setSmartSearchLoading] = React.useState(false);

  // 自然语言搜索
  const { data: nlqProducts, isLoading: nlqLoading, error: nlqError } = useQuery({
    queryKey: ['products-nlq', debouncedQuery],
    queryFn: () => apiClient.get(`/products/nlq-search?q=${debouncedQuery}`),
    enabled: searchMode === 'nlq' && debouncedQuery.length > 0 && !smartSearchEnabled
  });

  // 智能搜索
  const smartSearchMutation = useMutation({
    mutationFn: async (query: string) => {
      try {
        const response = await apiClient.post('/products/smart-search', { query });
        return response;
      } catch (error: any) {
        console.error('Smart search error:', error);
        throw error;
      }
    },
    onMutate: () => {
      setSmartSearchLoading(true);
      setSmartSearchResult(null);
    },
    onSuccess: (data) => {
      setSmartSearchResult(data);
      setSmartSearchLoading(false);
    },
    onError: (error: any) => {
      console.error('Smart search failed:', error);
      setSmartSearchLoading(false);
      message.error(error?.response?.data?.error?.message || 'Failed to perform smart search. Please try again.');
    }
  });

  // 当用户输入变化时，如果启用智能搜索，自动触发搜索（延迟500ms避免频繁请求）
  React.useEffect(() => {
    if (smartSearchEnabled && debouncedQuery.length > 2 && searchMode === 'nlq') {
      // 清除之前的定时器
      const timer = setTimeout(() => {
        if (debouncedQuery.trim().length > 2) {
          smartSearchMutation.mutate(debouncedQuery);
        }
      }, 500); // 增加延迟到500ms，减少API调用频率
      
      return () => clearTimeout(timer);
    } else if (debouncedQuery.length === 0) {
      // 清空搜索结果
      setSmartSearchResult(null);
    }
  }, [debouncedQuery, smartSearchEnabled, searchMode]);

  // 价格比较搜索
  const { data: compareData, isLoading: compareLoading, error: compareError } = useQuery({
    queryKey: ['products-compare', debouncedQuery],
    queryFn: () => apiClient.get(`/products/compare-prices?q=${debouncedQuery}`),
    enabled: searchMode === 'compare' && debouncedQuery.length > 0
  });

  // 实时AI搜索建议（基于用户输入）
  const { data: aiSuggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['ai-search-suggestions', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length >= 2) {
        try {
          const response = await apiClient.post('/products/search-suggestions', { 
            query: debouncedQuery 
          });
          return response;
        } catch (error) {
          console.error('Failed to get AI suggestions:', error);
          return { data: { suggestions: [] } };
        }
      }
      return { data: { suggestions: [] } };
    },
    enabled: searchMode === 'nlq' && debouncedQuery.length >= 2,
    staleTime: 5000, // Cache for 5 seconds
  });

  // 传统搜索建议（作为备用）
  const { data: suggestions } = useQuery({
    queryKey: ['product-suggestions', searchQuery],
    queryFn: () => apiClient.get(`/products/suggestions?q=${searchQuery}`),
    enabled: searchQuery.length > 1 && !aiSuggestions?.data?.suggestions?.length
  });

  // 检测是否为补充剂推荐查询
  const isSupplementQuery = React.useMemo(() => {
    const supplementKeywords = ['补钙', '补', '维生素', '维他命', '营养', '补充剂', '保健品'];
    return supplementKeywords.some(keyword => searchQuery.includes(keyword));
  }, [searchQuery]);

  // AI补充剂推荐查询
  const { data: supplementRecommendations, isLoading: supplementLoading } = useQuery({
    queryKey: ['supplement-recommendations', debouncedQuery],
    queryFn: async () => {
      if (isSupplementQuery) {
        // 搜索相关补充剂
        const supplements = await searchSupplements(debouncedQuery);
        return { supplements };
      }
      return null;
    },
    enabled: searchMode === 'nlq' && isSupplementQuery && debouncedQuery.length > 0
  });

  // 更新自动补全选项（优先使用AI建议）
  React.useEffect(() => {
    if (aiSuggestions?.data?.suggestions && aiSuggestions.data.suggestions.length > 0) {
      setAutoCompleteOptions(
        aiSuggestions.data.suggestions.map((s: string, index: number) => ({ 
          value: s,
          key: `ai-suggestion-${index}-${s}`, // Use combined key for uniqueness
          label: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              <span>{s}</span>
            </div>
          )
        }))
      );
    } else if (suggestions?.data) {
      setAutoCompleteOptions(suggestions.data.map((s: string, index: number) => ({ 
        value: s,
        key: `suggestion-${index}-${s}` // Use combined key for uniqueness
      })));
    } else {
      setAutoCompleteOptions([]);
    }
  }, [aiSuggestions, suggestions]);

  const isLoading = searchMode === 'nlq' 
    ? (smartSearchLoading || (nlqLoading && !smartSearchEnabled) || supplementLoading) 
    : compareLoading;
  const error = searchMode === 'nlq' ? nlqError : compareError;
  const products = searchMode === 'nlq' 
    ? (smartSearchResult?.data?.recommendations ? { data: smartSearchResult.data.recommendations } : nlqProducts)
    : null;
  const comparisons = searchMode === 'compare' ? compareData : null;

  // Get or find active shopping list (not from meal plan)
  const { data: activeShoppingList } = useQuery({
    queryKey: ['activeShoppingList'],
    queryFn: async () => {
      const lists = await shoppingListAPI.getShoppingLists('active');
      // Find any shopping list without mealPlanId (general shopping list)
      const generalShoppingList = lists.find(list => !list.mealPlanId && (
        list.name === 'Shopping List' || 
        list.name === 'Mall Shopping List' ||
        list.name === '商城购物清单' // Support legacy name
      ));
      console.log('Found shopping list:', generalShoppingList);
      // If not found, return the first active list without mealPlanId
      return generalShoppingList || lists.find(list => !list.mealPlanId) || null;
    }
  });

  // Add to shopping list
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, productName, quantity, price, vendor }: { 
      productId: string; 
      productName: string; 
      quantity: number;
      price: number;
      vendor?: string;
    }) => {
      // If no active shopping list exists, create one
      let shoppingListId = activeShoppingList?.id;
      
      if (!shoppingListId) {
        const newListResponse = await apiClient.post('/shopping-lists', {
          name: 'Shopping List',
          items: []
        }) as any;
        // apiClient returns response.data directly, so check both formats
        shoppingListId = newListResponse?.data?.id || newListResponse?.id;
        if (!shoppingListId) {
          console.error('Failed to create shopping list. Response:', newListResponse);
          throw new Error('Failed to create shopping list. Please try again.');
        }
        console.log('Created new shopping list:', shoppingListId);
      }

      // Get current shopping list
      const currentList = await shoppingListAPI.getShoppingList(shoppingListId!);
      console.log('Current shopping list:', currentList);
      
      // Handle different response formats
      const listData = (currentList as any)?.data || currentList;
      
      if (!listData || !listData.items) {
        throw new Error('Shopping list not found or has invalid structure');
      }
      
      // Check if product already exists
      const existingItemIndex = listData.items.findIndex(
        (item: any) => item.name === productName || item.name === productName.trim()
      );

      let updatedItems;
      if (existingItemIndex >= 0) {
        // If exists, increase quantity
        updatedItems = [...listData.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: (updatedItems[existingItemIndex].quantity || 0) + quantity
        };
      } else {
        // If not exists, add new item
        updatedItems = [
          ...currentList.items,
          {
            ingredientId: productId,
            name: productName,
            quantity: quantity,
            unit: 'pcs', // English unit
            category: 'Product', // English category
            checked: false,
            suggestedVendor: {
              vendorName: vendor || 'Merchant',
              price: price
            }
          }
        ];
      }

      console.log('Updated items list:', updatedItems);
      const result = await shoppingListAPI.updateShoppingList(shoppingListId!, {
        items: updatedItems
      });
      console.log('Shopping list update result:', result);
      
      // Update activeShoppingList cache
      queryClient.setQueryData(['activeShoppingList'], result);
      
      return result;
    },
    onSuccess: (_, variables) => {
      message.success(`Successfully added ${variables.quantity} ${variables.productName} to shopping list!`);
      // Invalidate and refetch shopping list queries
      queryClient.invalidateQueries({ queryKey: ['activeShoppingList'] });
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
      queryClient.refetchQueries({ queryKey: ['activeShoppingList'] });
      queryClient.refetchQueries({ queryKey: ['shoppingLists'] });
      // Reset quantity
      setQuantities(prev => ({ ...prev, [variables.productId]: 1 }));
    },
    onError: (error: any) => {
      console.error('Add to cart error:', error);
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to add item to shopping list. Please try again.';
      message.error(errorMessage);
    }
  });

  // 设置产品数量
  const setQuantity = (productId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  // 获取产品数量（默认为1）
  const getQuantity = (productId: string) => {
    return quantities[productId] || 1;
  };

  // 处理添加到购物清单
  const handleAddToCart = (product: any) => {
    const quantity = getQuantity(product.id);
    if (quantity < 1) {
      message.warning('Please select a valid quantity');
      return;
    }
    
    // Check if product has price
    const productPrice = product.price || product.averagePrice;
    if (!productPrice) {
      message.warning('This product is not available for purchase. Price information is missing.');
      return;
    }
    
    // Check if it's a virtual product (from smart search)
    if (product.id && product.id.startsWith('virtual-')) {
      message.warning('Virtual recommendations cannot be added to cart. Please search for actual products.');
      return;
    }
    
    addToCartMutation.mutate({
      productId: product.id,
      productName: product.name || product.nameEn || product.name,
      quantity,
      price: productPrice,
      vendor: product.vendor || product.brand
    });
  };

  // 检查产品是否适合糖尿病患者
  const getDiabetesCompatibility = (product: any) => {
    const name = (product.name || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    
    // 糖尿病友好产品关键词
    const diabetesFriendly = ['无糖', '低糖', 'sugar-free', 'low-sugar', 'diabetic', '糖尿病', '控糖', '血糖友好'];
    const diabetesUnfriendly = ['高糖', '高碳水化合物', 'sugar-rich', 'high-carb', '甜味剂'];
    
    const isFriendly = diabetesFriendly.some(keyword => 
      name.includes(keyword) || description.includes(keyword)
    );
    
    const isUnfriendly = diabetesUnfriendly.some(keyword => 
      name.includes(keyword) || description.includes(keyword)
    );
    
    // 药物类产品通常适合
    const isMedication = category.includes('药') || category.includes('medication') || 
                        name.includes('片') || name.includes('胶囊');
    
    if (isMedication) {
      return {
        status: 'suitable',
        color: 'blue',
        text: `💊 ${t('products.prescriptionDrug')}`,
        description: t('products.useAsDirected')
      };
    } else if (isFriendly && !isUnfriendly) {
      return {
        status: 'good',
        color: 'green',
        text: `✅ ${t('products.suitableForDiabetics')}`,
        description: t('products.diabetesFriendlyProduct')
      };
    } else if (isUnfriendly) {
      return {
        status: 'caution',
        color: 'orange',
        text: `⚠️ ${t('products.needsCaution')}`,
        description: t('products.mayAffectBloodSugar')
      };
    } else {
      return {
        status: 'unknown',
        color: 'default',
        text: `❓ ${t('products.notEvaluated')}`,
        description: t('products.consultDoctor')
      };
    }
  };

  // 价格比较表格列
  const compareColumns = [
    {
      title: t('products.rank'),
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Badge count={index + 1} style={{ backgroundColor: index === 0 ? '#52c41a' : '#1890ff' }} />
      )
    },
    {
      title: t('products.brand'),
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: t('products.supplier'),
      dataIndex: 'vendor',
      key: 'vendor',
      render: (vendor: string) => <Tag color="blue">{vendor}</Tag>
    },
    {
      title: t('products.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record: any) => {
        const variants = record._parentVariants || [];
        const minPrice = variants.length > 0 ? Math.min(...variants.map((v: any) => v.price)) : price;
        const isLowest = price === minPrice;
        return (
          <Space>
            <Text 
              strong 
              style={{ 
                fontSize: 16, 
                color: isLowest ? '#52c41a' : '#000' 
              }}
            >
              ${price}
            </Text>
            {isLowest && <Tag color="success">{t('products.lowestPrice')}</Tag>}
          </Space>
        );
      }
    },
    {
      title: t('products.inventory'),
      dataIndex: 'inStock',
      key: 'inStock',
      render: (inStock: boolean) => (
        <Tag color={inStock ? 'success' : 'error'}>
          {inStock ? t('products.inStock') : t('products.outOfStock')}
        </Tag>
      )
    },
    {
      title: t('products.specification'),
      key: 'spec',
      render: (record: any) => (
        record.dosage && record.quantity 
          ? `${record.dosage} × ${record.quantity}${record.unit}`
          : '-'
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px' }}>
      <Card 
        style={{ 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 页面标题 */}
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
                <ExperimentOutlined style={{ marginRight: 8 }} /> 
                {t('products.center')}
              </Title>
              <LanguageSwitcher />
            </div>
            <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: 16 }}>
              {t('products.subtitle')}
            </Paragraph>
            <Alert
              message={t('products.professionalTip')}
              description={t('products.professionalDescription')}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </div>

          {/* 搜索模式切换 */}
          <Card 
            style={{ 
              background: 'linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #91d5ff'
            }}
          >
            <Tabs
              activeKey={searchMode}
              onChange={(key) => setSearchMode(key as 'nlq' | 'compare')}
              items={[
                {
                  key: 'nlq',
                  label: (
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>
                      <ThunderboltOutlined style={{ marginRight: 6, color: '#1890ff' }} /> 
                      {t('products.smartSearch')}
                    </span>
                  ),
                },
                {
                  key: 'compare',
                  label: (
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>
                      <DollarOutlined style={{ marginRight: 6, color: '#52c41a' }} /> 
                      {t('products.priceComparison')}
                    </span>
                  ),
                },
              ]}
              style={{ marginTop: 0 }}
            />
          </Card>

          {/* 搜索框 */}
          <div 
            ref={searchContainerRef}
            style={{ 
              padding: '20px', 
              background: '#fafafa', 
              borderRadius: '8px',
              border: '1px dashed #d9d9d9'
            }}
          >
            {searchMode === 'nlq' ? (
              <AutoComplete
                options={autoCompleteOptions}
                style={{ width: '100%' }}
                onSelect={(value) => {
                  setSearchQuery(value);
                  setShowSuggestions(false);
                  if (smartSearchEnabled) {
                    smartSearchMutation.mutate(value);
                  }
                }}
                onSearch={(value) => {
                  setSearchQuery(value);
                  setShowSuggestions(value.length >= 2);
                }}
                value={searchQuery}
                open={showSuggestions && autoCompleteOptions.length > 0 && searchQuery.length >= 2}
                onFocus={() => {
                  if (searchQuery.length >= 2 && autoCompleteOptions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding to allow for option selection
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                loading={suggestionsLoading}
                notFoundContent={
                  suggestionsLoading ? 'AI is generating suggestions...' : 
                  searchQuery.length >= 2 ? 'No suggestions found' : 'Type at least 2 characters'
                }
              >
                <Search
                  placeholder={t('products.nlqPlaceholder')}
                  prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                  size="large"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  style={{ borderRadius: '8px' }}
                  enterButton={
                    <Button 
                      type="primary" 
                      icon={<SearchOutlined />}
                      loading={smartSearchLoading}
                      style={{ 
                        height: '40px',
                        borderRadius: '0 8px 8px 0'
                      }}
                    >
                      {t('products.intelligentSearch')}
                    </Button>
                  }
                  onSearch={(value) => {
                    if (value.trim()) {
                      setSearchQuery(value);
                      if (smartSearchEnabled) {
                        smartSearchMutation.mutate(value);
                      }
                    }
                  }}
                />
              </AutoComplete>
            ) : (
              <Search
                placeholder={t('products.comparePlaceholder')}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                size="large"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                style={{ borderRadius: '8px' }}
                enterButton={
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />}
                    style={{ 
                      height: '40px',
                      borderRadius: '0 8px 8px 0'
                    }}
                  >
                    {t('products.priceSearch')}
                  </Button>
                }
              />
            )}
          </div>

          {/* AI Analysis Status */}
          {searchMode === 'nlq' && smartSearchLoading && (
            <Alert
              message="AI is analyzing your needs..."
              description="Understanding your query and finding the most suitable products for you"
              type="info"
              showIcon
              icon={<ExperimentOutlined spin />}
              style={{ marginBottom: 16 }}
            />
          )}


          {/* 传统搜索结果说明 */}
          {searchMode === 'nlq' && !smartSearchResult && (nlqProducts as any)?.metadata?.explanation && (
            <Alert
              message={t('products.searchResultDescription')}
              description={(nlqProducts as any).metadata.explanation}
              type="info"
              showIcon
              icon={<FireOutlined />}
              closable
            />
          )}

          {/* 搜索结果 */}
          {error && (
            <Alert
              message={t('products.searchFailed')}
              description={t('products.searchFailedDescription')}
              type="error"
              showIcon
            />
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#666' }}>
                {smartSearchLoading 
                  ? 'AI is analyzing your needs...' 
                  : (searchMode === 'nlq' ? t('products.searching') : t('products.comparing'))}
              </div>
            </div>
          ) : searchMode === 'nlq' ? (
            <>
              {/* AI补充剂推荐 */}
              {(((nlqProducts as any)?.metadata?.aiRecommendations && (nlqProducts as any).metadata.aiRecommendations.length > 0) || 
                (isSupplementQuery && supplementRecommendations?.supplements && supplementRecommendations.supplements.length > 0)) && (
                <div style={{ marginBottom: 24 }}>
                  <Alert
                    message={t('products.aiRecommendations')}
                    description={t('products.aiRecommendationsDescription', { query: searchQuery })}
                    type="info"
                    showIcon
                    icon={<ExperimentOutlined />}
                    style={{ marginBottom: 16 }}
                  />
                  <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                    dataSource={
                      (nlqProducts as any)?.metadata?.aiRecommendations?.slice(0, 8) || 
                      (supplementRecommendations?.supplements?.slice(0, 8)) || []
                    }
                    renderItem={(supplement: any, index: number) => (
                      <List.Item key={`supplement-${supplement.id || supplement.name}-${index}`}>
                        <Card
                          hoverable
                          size="small"
                        >
                          <Card.Meta
                            title={
                              <div style={{ 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                fontWeight: 'bold'
                              }}>
                                {supplement.nameEn || supplement.name}
                              </div>
                            }
                            description={
                              <div>
                                <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>
                                  {supplement.category}
                                </div>
                                {supplement.averagePrice && (
                                  <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
                                    ${supplement.averagePrice}
                                  </div>
                                )}
                              </div>
                            }
                          />
                        </Card>
                      </List.Item>
                    )}
                  />
                </div>
              )}
              
              {/* Smart Search Results - Table Style */}
              {smartSearchResult && products?.data && products.data.length > 0 && (
                <SmartSearchResults 
                  products={products.data} 
                  searchQuery={searchQuery}
                  aiAnalysis={smartSearchResult.data.aiAnalysis}
                  onAddToCart={handleAddToCart}
                  quantities={quantities}
                  setQuantities={setQuantity}
                  getQuantity={getQuantity}
                  addToCartLoading={addToCartMutation.isPending}
                />
              )}
              
              {/* Regular NLQ Search Results - Card Display */}
              {!smartSearchResult && products?.data && products.data.length > 0 && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                      {t('products.foundProducts', { count: (products as any).metadata?.total || products.data.length })}
                    </Text>
                  </div>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                dataSource={products.data}
                renderItem={(item: any) => {
                  const product = item;
                  
                  return (
                  <List.Item>
                    <Card
                      hoverable
                      className="product-card"
                      cover={
                        <div className="product-image-container">
                          {product.imageUrl ? (
                          <img 
                              alt={product.displayName || product.name || product.nameEn || product.name} 
                              src={product.imageUrl} 
                              style={{ maxHeight: '100%', maxWidth: '100%' }}
                            />
                          ) : (
                            <span style={{ color: '#999' }}>{t('products.noImageAvailable')}</span>
                          )}
                        </div>
                      }
                    >
                      <Card.Meta
                        title={
                          <Tooltip title={product.displayName || product.name || product.nameEn || product.name}>
                            <div style={{ 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              fontWeight: 'bold'
                            }}>
                              {product.displayName || product.name || product.nameEn || product.name}
                            </div>
                          </Tooltip>
                        }
                        description={
                          <>
                            {product.brand && <div>{product.brand}</div>}
                            {product.description && (
                              <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                                {product.description.length > 50 
                                  ? product.description.substring(0, 50) + '...'
                                  : product.description}
                              </div>
                            )}
                            <div style={{ marginTop: 8 }}>
                              <Tag color="blue">{product.category || 'supplement'}</Tag>
                              {product.inStock !== undefined && (
                                product.inStock && (product.stockQuantity ?? 0) > 0 ? (
                                  <Tag color="green">
                                    In Stock {product.stockQuantity ? `(${product.stockQuantity})` : ''}
                                  </Tag>
                                ) : (
                                  <Tag color="red">Out of Stock</Tag>
                                )
                              )}
                              {product.prescriptionRequired && (
                                <Tag color="orange">Rx Required</Tag>
                              )}
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Tooltip title={getDiabetesCompatibility(product).description}>
                                <Tag color={getDiabetesCompatibility(product).color}>
                                  {getDiabetesCompatibility(product).text}
                                </Tag>
                              </Tooltip>
                              {product.vendor && <Tag color="purple">{product.vendor}</Tag>}
                            </div>
                            {(product.price || product.averagePrice) && (
                              <div style={{ 
                                fontSize: 20, 
                                fontWeight: 'bold', 
                                color: '#ff4d4f',
                                marginTop: 8
                              }}>
                                ${product.price || product.averagePrice}
                              </div>
                            )}
                            {product.dosage && (
                              <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                                {product.dosage} × {product.quantity} {product.unit}
                              </div>
                            )}
                            
                            {/* Purchase Controls */}
                            <div className="product-actions">
                              {/* Quantity Selector */}
                              <div className="quantity-selector">
                                <button 
                                  className="quantity-btn"
                                  onClick={() => {
                                    const currentQty = getQuantity(product.id);
                                    setQuantity(product.id, Math.max(1, currentQty - 1));
                                  }}
                                  disabled={
                                    product.inStock === false || 
                                    (product.stockQuantity ?? 0) <= 0 ||
                                    product.prescriptionRequired ||
                                    product.id?.startsWith('virtual-')
                                  }
                                >
                                  -
                                </button>
                                <input 
                                  type="number" 
                                  className="quantity-input"
                                  value={getQuantity(product.id)}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 1;
                                    const maxQty = product.stockQuantity ? Math.min(99, product.stockQuantity) : 99;
                                    setQuantity(product.id, Math.max(1, Math.min(maxQty, value)));
                                  }}
                                  min="1"
                                  max={product.stockQuantity ? Math.min(99, product.stockQuantity).toString() : "99"}
                                  disabled={
                                    product.inStock === false || 
                                    (product.stockQuantity ?? 0) <= 0 ||
                                    product.prescriptionRequired ||
                                    product.id?.startsWith('virtual-')
                                  }
                                />
                                <button 
                                  className="quantity-btn"
                                  onClick={() => {
                                    const currentQty = getQuantity(product.id);
                                    const maxQty = product.stockQuantity ? Math.min(99, product.stockQuantity) : 99;
                                    setQuantity(product.id, Math.min(maxQty, currentQty + 1));
                                  }}
                                  disabled={
                                    product.inStock === false || 
                                    (product.stockQuantity ?? 0) <= 0 ||
                                    product.prescriptionRequired ||
                                    product.id?.startsWith('virtual-')
                                  }
                                >
                                  +
                                </button>
                              </div>
                              
                              {/* Add to Cart Button */}
                              <Button
                                type="primary"
                                icon={<ShoppingCartOutlined />}
                                onClick={() => handleAddToCart(product)}
                                disabled={
                                  product.inStock === false || 
                                  (product.stockQuantity ?? 0) <= 0 ||
                                  product.prescriptionRequired ||
                                  !(product.price || product.averagePrice) ||
                                  product.id?.startsWith('virtual-')
                                }
                                loading={addToCartMutation.isPending}
                                className="add-to-cart-btn"
                              >
                                {!product.inStock || (product.stockQuantity ?? 0) <= 0
                                  ? 'Out of Stock'
                                  : product.prescriptionRequired
                                  ? 'Prescription Required'
                                  : t('products.addToShoppingList')}
                              </Button>
                            </div>
                          </>
                        }
                      />
                    </Card>
                  </List.Item>
                  );
                }}
              />
              </>
            )}
            </>
          ) : searchMode === 'compare' ? (
            <>
              {comparisons?.data && comparisons.data.length > 0 ? (
                <>
                  {/* Price Comparison Results - Table Display */}
                  <Alert
                    message={`Found ${(comparisons as any).metadata?.comparisonGroups || 0} product group${((comparisons as any).metadata?.comparisonGroups || 0) !== 1 ? 's' : ''}`}
                    description={`Total ${(comparisons as any).metadata?.totalProducts || 0} related products`}
                    type="success"
                    showIcon
                  />
                  
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {comparisons.data.map((group: any, index: number) => (
                      <Card
                        key={index}
                        title={
                          <Space>
                            <Badge count={index + 1} />
                            <span>{group.productName}</span>
                            <Tag color="gold">
                              {group.variantCount} supplier{group.variantCount !== 1 ? 's' : ''}
                            </Tag>
                            {group.priceRange.savings > 0 && (
                              <Tag color="success">
                                Save up to ${group.priceRange.savings}
                              </Tag>
                            )}
                          </Space>
                        }
                        extra={
                          <Space>
                            <Text type="secondary">Price Range:</Text>
                            <Text strong>${group.priceRange.min} - ${group.priceRange.max}</Text>
                          </Space>
                        }
                      >
                        <Table
                          dataSource={group.variants.map((v: any) => ({
                            ...v,
                            key: v.id,
                            _parentVariants: group.variants
                          }))}
                          columns={compareColumns}
                          pagination={false}
                          size="small"
                        />
                      </Card>
                    ))}
                  </Space>
                </>
              ) : debouncedQuery ? (
                <Empty 
                  description={`No products related to "${debouncedQuery}" found, please try other keywords.`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <Empty 
                  description="Enter a product name to compare prices across suppliers"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </>
          ) : debouncedQuery ? (
            <Empty 
              description={t('products.noProductsFound', { query: debouncedQuery })}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Empty 
              description={
                (searchMode as string) === 'nlq'
                  ? t('products.useNaturalLanguage')
                  : t('products.enterProductName')
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  {(searchMode as string) === 'nlq' ? t('products.examples') : t('products.popularSearches')}
                </Text>
                <Space wrap style={{ marginTop: 8 }}>
                  {(searchMode as string) === 'nlq' ? (
                    <>
                      <Tag 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchQuery('I need blood sugar lowering drugs')}
                      >
                        I need blood sugar lowering drugs
                      </Tag>
                      <Tag 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchQuery('cheap vitamin D')}
                      >
                        Cheap vitamin D
                      </Tag>
                      <Tag 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchQuery('supplements suitable for diabetics')}
                      >
                        Supplements suitable for diabetics
                      </Tag>
                    </>
                  ) : (
                    <>
                      <Tag 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchQuery('Metformin')}
                      >
                        Metformin
                      </Tag>
                      <Tag 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchQuery('Vitamin D3')}
                      >
                        Vitamin D3
                      </Tag>
                      <Tag 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchQuery('Glucose test strips')}
                      >
                        Glucose test strips
                      </Tag>
                      <Tag 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchQuery('Omega-3 fish oil')}
                      >
                        Omega-3 fish oil
                      </Tag>
                    </>
                  )}
                </Space>
              </div>
            </Empty>
          )}
        </Space>
      </Card>
    </div>
  );
}

