/**
 * Service to interact with the Aica Python Backend API.
 * This API runs on localhost:8000 by default.
 */

const API_BASE_URL = 'http://localhost:8000';

interface GenerateReportResponse {
    success: boolean;
    message?: string;
    error?: string;
}

interface ProcessMessageResponse {
    success: boolean;
    error?: string;
}

export const pythonApiService = {
    /**
     * Check if the API is available
     */
    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return response.ok;
        } catch (error) {
            console.warn('Python API unavailable:', error);
            return false;
        }
    },

    /**
     * Trigger the generation of a daily report manually
     * @param date Optional date in YYYY-MM-DD format
     */
    async generateDailyReport(date?: string): Promise<GenerateReportResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ report_date: date }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to generate report:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },

    /**
     * Send a manual message for processing (Development/Testing)
     */
    async processTestMessage(
        message: string,
        contactId: string,
        userId: string
    ): Promise<ProcessMessageResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/messages/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message_text: message,
                    contact_id: contactId,
                    user_id: userId,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to process message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
};
