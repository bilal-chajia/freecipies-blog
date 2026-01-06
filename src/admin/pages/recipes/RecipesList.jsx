import ContentListBase from '@/components/shared/ContentListBase';
import { Utensils } from 'lucide-react';

const RecipesList = () => {
    return (
        <ContentListBase
            contentType="recipe"
            title="Recipes"
            description="Manage your culinary creations and cooking instructions."
            newButtonLabel="New Recipe"
            newButtonPath="/recipes/new"
            editPathPrefix="/recipes"
            editIdField="slug"
            livePathPrefix="/recipes"
            typeIcon={Utensils}
            statsLabel="Total Recipes"
        />
    );
};

export default RecipesList;
