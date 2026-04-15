/**
 * Hook for auto-refreshing check-ins list
 * Provides real-time updates for check-ins without manual refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

interface CheckIn {
  id: string;
  reminderId: string;
  status: string;
  completedAt?: string;
  triggeredAt: string;
}

/**
 * Auto-refresh check-ins using polling
 */
export function useAutoRefreshCheckIns() {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const {
    data: checkIns = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['checkins', 'today'],
    queryFn: async () => {
      const response = await apiClient.get('/check-ins/today');
      return response.data || [];
    },
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['checkins', 'today'] });
    setLastUpdate(Date.now());
  }, [queryClient]);

  return {
    checkIns: checkIns as CheckIn[],
    isLoading,
    error,
    refresh,
    lastUpdate,
  };
}

/**
 * Hook for real-time check-ins using WebSocket (if available)
 */
export function useRealTimeCheckIns() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Try to connect to WebSocket
    let ws: WebSocket | null = null;

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      ws = new WebSocket(`${wsUrl}/ws/checkins`);

      ws.onopen = () => {
        console.log('WebSocket connected for check-ins');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_checkin') {
            setCheckIns((prev) => [data.checkIn, ...prev]);
          } else if (data.type === 'checkin_updated') {
            setCheckIns((prev) =>
              prev.map((ci) => (ci.id === data.checkIn.id ? data.checkIn : ci))
            );
          } else if (data.type === 'checkins_list') {
            setCheckIns(data.checkIns || []);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (ws?.readyState === WebSocket.CLOSED) {
            // Reconnect logic would go here
          }
        }, 5000);
      };
    } catch (error) {
      console.warn('WebSocket not available, falling back to polling');
      setIsConnected(false);
    }

    // Fallback: load initial data via HTTP
    apiClient
      .get('/check-ins/today')
      .then((response) => {
        setCheckIns(response.data || []);
      })
      .catch((error) => {
        console.error('Failed to load check-ins:', error);
      });

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return {
    checkIns,
    isConnected,
  };
}

