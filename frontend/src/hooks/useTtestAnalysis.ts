import { useState } from 'react';
import API_ENDPOINTS from '../config/api';

interface TtestResult {
  id: number;
  reference_group: string | null;
  num_proteins: number;
  created_at: string;
  updated_at: string;
  results_data: any;
}

interface UseTtestAnalysisReturn {
  isRunning: boolean;
  runAnalysis: (datasetId: string, referenceGroup?: string | null) => Promise<TtestResult | null>;
  error: string | null;
  setError: (error: string | null) => void;
}

/**
 * Custom hook for running ttest statistical analysis
 */
export const useTtestAnalysis = (): UseTtestAnalysisReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (
    datasetId: string,
    referenceGroup?: string | null
  ): Promise<TtestResult | null> => {
    setIsRunning(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const url = new URL(API_ENDPOINTS.RUN_TTEST);
      url.searchParams.append('dataset_id', datasetId);
      if (referenceGroup) {
        url.searchParams.append('reference_group', referenceGroup);
      }

      console.log('[useTtestAnalysis] Running analysis with URL:', url.toString());

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: TtestResult = await response.json();
      console.log('[useTtestAnalysis] Analysis completed successfully');
      console.log('[useTtestAnalysis] Result num_proteins:', result.num_proteins);

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to run ttest analysis';
      console.error('[useTtestAnalysis] Error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsRunning(false);
    }
  };

  return {
    isRunning,
    runAnalysis,
    error,
    setError,
  };
};

export default useTtestAnalysis;
