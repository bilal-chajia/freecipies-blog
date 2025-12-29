import { motion } from 'framer-motion';
import { ScrollArea } from '@/ui/scroll-area.jsx';
import MediaSection from './MediaSection';
import SEOSection from './SEOSection';
import ExcerptsSection from './ExcerptsSection';
import TagsSection from './TagsSection';

// Animation variants for staggered children
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
        }
    },
};

export default function EditorSidebar({
    formData,
    onInputChange,
    imagesData,
    onImageRemove,
    tags,
    onMediaDialogOpen,
    isEditMode,
}) {
    return (
        <aside className="sticky top-0 h-screen">
            <ScrollArea className="h-full">
                <motion.div
                    className="p-6 space-y-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants}>
                        <TagsSection
                            formData={formData}
                            onInputChange={onInputChange}
                            tags={tags}
                        />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <MediaSection
                            formData={formData}
                            imagesData={imagesData}
                            onInputChange={onInputChange}
                            onImageRemove={onImageRemove}
                            onMediaDialogOpen={onMediaDialogOpen}
                        />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <SEOSection
                            formData={formData}
                            onInputChange={onInputChange}
                            isEditMode={isEditMode}
                        />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <ExcerptsSection
                            formData={formData}
                            onInputChange={onInputChange}
                        />
                    </motion.div>

                    {/* Bottom padding for scroll */}
                    <div className="h-20" />
                </motion.div>
            </ScrollArea>
        </aside>
    );
}
