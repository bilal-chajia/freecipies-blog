/**
 * Custom Block: Recipe Card
 * 
 * Embed a summary of another recipe from the site.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { BookOpen, Edit3, Search, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar, { ToolbarButton } from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';

// Mock function for searching recipes (replace with real API later)
const searchRecipes = async (query) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
        { id: 1, slug: 'chocolate-chip-cookies', headline: 'Classic Chocolate Chip Cookies', thumbnail: 'https://placehold.co/100', totalTime: 45, difficulty: 'Easy' },
        { id: 2, slug: 'sourdough-bread', headline: 'Rustic Sourdough Bread', thumbnail: 'https://placehold.co/100', totalTime: 1440, difficulty: 'Advanced' },
    ].filter(r => r.headline.toLowerCase().includes(query.toLowerCase()));
};

export const RecipeEmbedBlock = createReactBlockSpec(
    {
        type: 'recipeEmbed',
        propSchema: {
            articleId: { default: null },
            slug: { default: '' },
            headline: { default: '' },
            thumbnail: { default: '' },
            difficulty: { default: '' },
            totalTime: { default: 0 },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const [searchTerm, setSearchTerm] = useState('');
            const [results, setResults] = useState([]);
            const [loading, setLoading] = useState(false);
            const [showSearch, setShowSearch] = useState(!block.props.articleId);
            const { isSelected, selectBlock } = useBlockSelection(block.id);

            const moveBlockUp = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksUp();
                requestAnimationFrame(() => selectBlock());
            };

            const moveBlockDown = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksDown();
                requestAnimationFrame(() => selectBlock());
            };

            const sideMenu = editor.extensions?.sideMenu;
            const handleDragStart = (event) => {
                sideMenu?.blockDragStart?.(event, block);
            };
            const handleDragEnd = () => {
                sideMenu?.blockDragEnd?.();
            };

            const toolbar = (
                <BlockToolbar
                    blockIcon={BookOpen}
                    blockLabel="Recipe Card"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    showMoreMenu={false}
                >
                    <ToolbarButton
                        icon={Edit3}
                        label="Change recipe"
                        onClick={() => setShowSearch(true)}
                    />
                </BlockToolbar>
            );

            useEffect(() => {
                if (searchTerm.length > 2) {
                    setLoading(true);
                    searchRecipes(searchTerm).then(data => {
                        setResults(data);
                        setLoading(false);
                    });
                }
            }, [searchTerm]);

            const selectRecipe = (recipe) => {
                editor.updateBlock(block, {
                    type: 'recipeEmbed',
                    props: {
                        ...block.props,
                        articleId: recipe.id,
                        slug: recipe.slug,
                        headline: recipe.headline,
                        thumbnail: recipe.thumbnail,
                        difficulty: recipe.difficulty,
                        totalTime: recipe.totalTime,
                    },
                });
                setShowSearch(false);
            };

            if (showSearch) {
                return (
                    <BlockWrapper
                        isSelected={isSelected}
                        toolbar={toolbar}
                        onClick={selectBlock}
                        onFocus={selectBlock}
                        onPointerDownCapture={selectBlock}
                        blockType="recipe-embed"
                        blockId={block.id}
                    >
                        <div className="border border-gray-200 rounded-lg p-4 my-2 bg-white shadow-sm">
                            <h4 className="font-medium mb-2 text-sm text-gray-700">Embed Recipe Card</h4>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search for a recipe..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                            </div>

                            {loading && (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="animate-spin h-5 w-5 text-primary" />
                                </div>
                            )}

                            {results.length > 0 && !loading && (
                                <ul className="mt-2 text-sm border rounded-md divide-y max-h-40 overflow-y-auto">
                                    {results.map(recipe => (
                                        <li
                                            key={recipe.id}
                                            onClick={() => selectRecipe(recipe)}
                                            className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                                        >
                                            <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden">
                                                <img src={recipe.thumbnail} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <span>{recipe.headline}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </BlockWrapper>
                );
            }

            return (
                <BlockWrapper
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
                    blockType="recipe-embed"
                    blockId={block.id}
                >
                    <div className="flex items-start gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm my-4 group relative">
                        <div className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                            {block.props.thumbnail ? (
                                <img src={block.props.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No image</div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg leading-tight mb-1">{block.props.headline || 'Recipe Title'}</h3>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                                {block.props.totalTime > 0 && <span>{block.props.totalTime} mins</span>}
                                {block.props.difficulty && <span className="capitalize">{block.props.difficulty}</span>}
                            </div>
                            <a href={`/recipes/${block.props.slug}`} className="text-sm text-primary hover:underline mt-2 inline-block" onClick={(e) => e.preventDefault()}>View recipe</a>
                        </div>

                        <button
                            onClick={() => setShowSearch(true)}
                            className="absolute top-2 right-2 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            Change
                        </button>
                    </div>
                </BlockWrapper>
            );
        },
    }
);




