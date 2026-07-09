import TaxonomyManager from '../_components/TaxonomyManager';

export default function TagsPage() {
  return <TaxonomyManager resource="tags" singular="tag" plural="tags" canDelete={false} />;
}
