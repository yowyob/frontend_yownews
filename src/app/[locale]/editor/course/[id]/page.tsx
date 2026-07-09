import CourseUnitsManager from './CourseUnitsManager';

export default async function CourseUnitsPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  return <CourseUnitsManager courseId={id} />;
}
