import { type SchemaTypeDefinition } from 'sanity'
import { announcementType } from './announcement'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [announcementType],
}
