import axios from 'axios';
import { PlaneTaskInput, AtlasTask } from '../types/plane';

const N8N_URL = import.meta.env.VITE_N8N_URL;
const N8N_WEBHOOK_PATH = '/webhook/atlas-create-task'; // Ajuste conforme a rota real do n8n

export const atlasService = {
    createTask: async (taskInput: PlaneTaskInput): Promise<AtlasTask> => {
        try {
            const response = await axios.post(`${N8N_URL}${N8N_WEBHOOK_PATH}`, taskInput, {
                headers: {
                    'Content-Type': 'application/json',
                    // Adicione autenticação se necessário pelo n8n
                }
            });

            // O n8n deve retornar a tarefa criada com o ID real do Plane
            return response.data;
        } catch (error) {
            console.error('Erro ao criar tarefa via n8n:', error);
            throw error;
        }
    }
};
