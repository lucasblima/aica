
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { MOCK_DB } from '../../constants';
import { AssociationDetail } from '../../types';

export const useAssociationsData = () => {
    const [associations, setAssociations] = useState<AssociationDetail[]>(MOCK_DB.associationsList);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssociations = async () => {
            try {
                setLoading(true);
                // const { data } = await supabase.from('associations').select('*');
                // if (data) setAssociations(data);

                console.log('Fetching associations...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Error fetching associations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssociations();
    }, []);

    return { associations, loading };
};
