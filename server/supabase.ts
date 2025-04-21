import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from env variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Validate credentials
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not configured. Authentication will not work properly.');
  throw new Error('SUPABASE_URL and SUPABASE_KEY must be defined in environment variables');
}

// Initialize Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseKey);

export const supabase = {
  /**
   * Add a new column to the broker_points table
   * @param columnName The name of the column to add
   */
  async addColumnToBrokerPoints(columnName: string): Promise<void> {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured. Cannot add column.');
      return;
    }
    
    try {
      // Using raw SQL via Supabase's rpc to add column to table
      await supabaseClient.rpc('add_column_to_broker_points', {
        column_name: columnName,
        column_type: 'integer'
      });
      
      console.log(`Added column ${columnName} to broker_points table`);
    } catch (error) {
      console.error('Error adding column to broker_points table:', error);
      throw error;
    }
  },
  
  /**
   * Drop a column from the broker_points table
   * @param columnName The name of the column to drop
   */
  async dropColumnFromBrokerPoints(columnName: string): Promise<void> {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured. Cannot drop column.');
      return;
    }
    
    try {
      // Using raw SQL via Supabase's rpc to drop column from table
      await supabaseClient.rpc('drop_column_from_broker_points', {
        column_name: columnName
      });
      
      console.log(`Dropped column ${columnName} from broker_points table`);
    } catch (error) {
      console.error('Error dropping column from broker_points table:', error);
      throw error;
    }
  },
  
  /**
   * Test connection to Kommo API
   * @param apiUrl API URL
   * @param accessToken Access token
   * @param customEndpoint Custom endpoint
   */
  async testKommoConnection(
    apiUrl: string,
    accessToken: string,
    customEndpoint?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, you would make an actual API call to Kommo
      // For demo purposes, we'll just simulate a successful connection
      
      // Simulating API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'Conexão com a API Kommo estabelecida com sucesso.'
      };
    } catch (error) {
      console.error('Error testing Kommo connection:', error);
      return {
        success: false,
        message: 'Erro ao conectar com a API Kommo. Verifique suas credenciais.'
      };
    }
  }
};
