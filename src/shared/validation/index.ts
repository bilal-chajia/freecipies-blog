/**
 * Validation barrel export
 * Usage: import { validate, validateBody, validateParams, validateQuery, z, IdParam, PaginationQuery } from '@shared/validation';
 */
export { validate, validateBody, validateParams, validateQuery, z } from './helpers';
export { IdParam, SlugOrIdParam, PaginationSchema, PaginationQuery, LabelField, SlugField, DescriptionField } from './schemas/common';
export { ArticleListQuery, CreateArticleSchema, UpdateArticleSchema, ArticleActionQuery } from './schemas/articles';
export { ContentDocumentInputSchema, ContentDocumentSchema, ContentBlockSchema } from '@modules/content-blocks';
export { CreateCategorySchema, UpdateCategorySchema } from './schemas/categories';
export { CreateTagSchema, UpdateTagSchema } from './schemas/tags';
export { ProxyImageQuery } from './schemas/media';
export {
  MediaListQuery,
  BulkDeleteSchema,
  ConfirmUploadSchema,
  UpdateMediaSchema,
  VariantUploadFields,
  StoredVariantSchema,
  MediaVariantsJsonSchema,
  type MediaVariantsJsonInput,
} from './schemas/media';
export { CreateAuthorSchema, UpdateAuthorSchema } from './schemas/authors';
export {
  MenuItemSchema,
  MenuSchema,
  SaveMenusSchema,
  CreateMenuSchema,
  DeleteMenuQuery,
  AppearanceSchema,
  ImageUploadSettingsSchema,
} from './schemas/settings';
export { CreateEquipmentSchema, UpdateEquipmentSchema } from './schemas/equipment';
export { CreateTemplateSchema, UpdateTemplateSchema, TemplateThumbnailUploadFields } from './schemas/templates';
export { CreateRedirectSchema, UpdateRedirectSchema } from './schemas/redirects';
export {
  GenerateSchema,
  ProviderParam,
  ProviderModelParam,
  AddModelSchema,
  UpdateModelSchema,
  UpdateSettingsSchema,
  ValidateApiKeySchema,
  CreateCustomProviderSchema,
  UpdateCustomProviderSchema,
} from './schemas/ai';
export { LoginSchema, RefreshSchema } from './schemas/auth';
export {
  PinListQuery,
  PinDeleteQuery,
  CreatePinSchema,
  UpdatePinSchema,
  BoardGetQuery,
  BoardDeleteQuery,
  CreatePinterestBoardSchema,
  UpdatePinterestBoardSchema,
} from './schemas/pins';
