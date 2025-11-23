
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { n8nApi, evolutionApi, customAppApi } from '../services/api';
import { MOCK_DB } from '../../constants'; // Fallback
import { SystemHealth, WorkItemB2B, ActivityLog } from '../../types';

export const useDashboardData = () => {
    const [kpi, setKpi] = useState(MOCK_DB.kpi);
    const [systemHealth, setSystemHealth] = useState<SystemHealth>(MOCK_DB.systemHealth);
    const [workloadDistribution, setWorkloadDistribution] = useState(MOCK_DB.workloadDistribution);
    const [priorityDistribution, setPriorityDistribution] = useState(MOCK_DB.priorityDistribution);
    const [riskItems, setRiskItems] = useState<WorkItemB2B[]>(MOCK_DB.riskItems);
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>(MOCK_DB.recentActivity);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Example: Fetch KPI from Supabase
                // const { data: kpiData } = await supabase.from('kpis').select('*').single();
                // if (kpiData) setKpi(kpiData);

                // Example: Fetch Risk Items
                // const { data: risks } = await supabase.from('work_items').select('*').eq('isOverdue', true);
                // if (risks) setRiskItems(risks);

                // Example: Fetch from n8n or Custom App
                // const healthRes = await customAppApi.get('/health');
                // if (healthRes.data) setSystemHealth(healthRes.data);

                console.log('Fetching dashboard data...');
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return {
        kpi,
        systemHealth,
        workloadDistribution,
        priorityDistribution,
        riskItems,
        recentActivity,
        loading
    };
};
