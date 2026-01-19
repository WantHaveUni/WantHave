export interface AISuggestion {
    title: string;
    description: string;
    category_id: number | null;
    category_name: string;
    price_min: number;
    price_max: number;
    error?: string;
}
