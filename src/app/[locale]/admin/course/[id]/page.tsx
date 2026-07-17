import CourseUnitsManager from '../../../editor/course/[id]/CourseUnitsManager';

export default async function AdminCourseUnitsPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  return <CourseUnitsManager courseId={id} />;
}
