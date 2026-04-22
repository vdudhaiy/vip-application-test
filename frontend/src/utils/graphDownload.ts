/**
 * Utility functions for downloading graph images
 */

import API_ENDPOINTS from '../config/api';

export interface DownloadGraphsOptions {
  datasetId: string;
  token: string;
  dataType?: 'data' | 'filter' | 'normal' | 'transform' | 'impute';
  graphType: 'patient' | 'case';
}

/**
 * Download distribution graphs as PNG image
 */
export async function downloadGraphImage(options: DownloadGraphsOptions): Promise<void> {
  const { datasetId, token, dataType = 'data', graphType } = options;

  if (!datasetId || !token) {
    throw new Error('Dataset ID and token are required');
  }

  try {
    const endpoint =
      graphType === 'patient'
        ? API_ENDPOINTS.DOWNLOAD_PATIENT_GRAPHS
        : API_ENDPOINTS.DOWNLOAD_CASE_GRAPHS;

    const url = `${endpoint}?dataset_id=${datasetId}&data_type=${dataType}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to download ${graphType} graphs: ${response.statusText}`
      );
    }

    // Get the blob
    const blob = await response.blob();

    // Create a download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${graphType}_distribution_${dataType}.png`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error(`Error downloading ${graphType} graphs:`, error);
    throw error;
  }
}

/**
 * Hook-like function to create download handlers
 */
export function useGraphDownload() {
  const downloadPatientGraphs = async (datasetId: string, dataType?: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    return downloadGraphImage({
      datasetId,
      token,
      dataType: (dataType as any) || 'data',
      graphType: 'patient',
    });
  };

  const downloadCaseGraphs = async (datasetId: string, dataType?: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    return downloadGraphImage({
      datasetId,
      token,
      dataType: (dataType as any) || 'data',
      graphType: 'case',
    });
  };

  return {
    downloadPatientGraphs,
    downloadCaseGraphs,
  };
}

/**
 * Download volcano plot as PNG image
 */
export async function downloadVolcanoPlot(
  datasetId: string,
  referenceGroup?: string,
  contrast?: string
): Promise<void> {
  const token = localStorage.getItem('token');

  if (!datasetId || !token) {
    throw new Error('Dataset ID and token are required');
  }

  try {
    const url = new URL(API_ENDPOINTS.DOWNLOAD_VOLCANO_PLOT);
    url.searchParams.append('dataset_id', datasetId);
    if (referenceGroup) {
      url.searchParams.append('reference_group', referenceGroup);
    }
    if (contrast) {
      url.searchParams.append('contrast', contrast);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to download volcano plot: ${response.statusText}`);
    }

    // Get the blob
    const blob = await response.blob();

    // Create a download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = contrast ? `volcano_plot_${contrast}.png` : 'volcano_plot.png';

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading volcano plot:', error);
    throw error;
  }
}

/**
 * Download heatmap as PNG image
 */
export async function downloadHeatmap(
  datasetId: string,
  topN: number = 20,
  aggregateToProteinLevel: boolean = true,
  aggregationMethod: string = 'mean'
): Promise<void> {
  const token = localStorage.getItem('token');

  if (!datasetId || !token) {
    throw new Error('Dataset ID and token are required');
  }

  try {
    const url = new URL(API_ENDPOINTS.DOWNLOAD_HEATMAP);
    url.searchParams.append('dataset_id', datasetId);
    url.searchParams.append('top_n', topN.toString());
    url.searchParams.append('aggregate_to_protein_level', aggregateToProteinLevel.toString());
    url.searchParams.append('aggregation_method', aggregationMethod);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to download heatmap: ${response.statusText}`);
    }

    // Get the blob
    const blob = await response.blob();

    // Create a download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `heatmap_top${topN}.png`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading heatmap:', error);
    throw error;
  }
}
