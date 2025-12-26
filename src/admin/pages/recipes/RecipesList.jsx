import ArticlesList from '../articles/ArticlesList';

/**
 * Recipes List Page
 * Wrapper that renders ArticlesList with type=recipe filter
 */
const RecipesList = () => {
    return <ArticlesList fixedType="recipe" />;
};

export default RecipesList;
