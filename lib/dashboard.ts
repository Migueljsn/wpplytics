import { mockClient, mockConversations, mockQualitativePreview, mockQuantitativePreview } from '@/lib/mock-data';

export async function getDashboardClient(clientId: string) {
  return {
    ...mockClient,
    id: clientId,
  };
}

export async function getInstanceConversations() {
  return mockConversations;
}

export async function getReportPreviews() {
  return {
    quantitative: mockQuantitativePreview,
    qualitative: mockQualitativePreview,
  };
}
