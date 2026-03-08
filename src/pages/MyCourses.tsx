import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CourseCard from "@/components/CourseCard";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function MyCourses() {
  const { user } = useAuth();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="container py-8 space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Мои курсы</h1>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : enrollments?.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e) => (
            <CourseCard key={e.id} course={e.courses as any} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 space-y-4">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto" />
          <p className="text-lg text-muted-foreground">Вы ещё не записаны ни на один курс</p>
          <Button asChild className="gradient-primary text-primary-foreground">
            <Link to="/courses">Перейти в каталог</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
