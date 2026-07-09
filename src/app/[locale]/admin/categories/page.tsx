import TaxonomyManager from '../_components/TaxonomyManager';

export default function CategoriesPage() {
  return <TaxonomyManager resource="categories" singular="catégorie" plural="catégories" canDelete />;
}
