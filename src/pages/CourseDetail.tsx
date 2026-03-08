import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Play, FileText, Code, CheckCircle2, Signal } from "lucide-react";

const typeIcons: Record<string, any> = { text: FileText, video: Play, code: Code };

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      // Get teacher profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", data.teacher_id)
        .single();
      return { ...data, profiles: profile };
    },
    enabled: !!id,
  });

  const { data: sections } = useQuery({
    queryKey: ["course-sections", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*, lessons(id, title, content_type, position)")
        .eq("course_id", id!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Нужно войти в аккаунт");
      const { error } = await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: id! });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Вы записались на курс!");
      queryClient.invalidateQueries({ queryKey: ["enrollment", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="container py-8"><div className="h-64 bg-muted rounded-lg animate-pulse" /></div>;
  if (!course) return <div className="container py-16 text-center text-muted-foreground">Курс не найден</div>;

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero py-12">
        <div className="container space-y-4">
          <div className="flex items-center gap-2">
            {course.category && <Badge variant="secondary">{course.category}</Badge>}
            {course.difficulty && (
              <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground">
                <Signal className="mr-1 h-3 w-3" />
                {course.difficulty === "beginner" ? "Начальный" : course.difficulty === "intermediate" ? "Средний" : "Продвинутый"}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">{course.title}</h1>
          {course.description && (
            <p className="text-primary-foreground/80 max-w-2xl text-lg">{course.description}</p>
          )}
          <p className="text-primary-foreground/60 text-sm">
            Автор: {course.profiles?.display_name ?? "Неизвестный"}
          </p>
          <div className="pt-2">
            {enrollment ? (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  const firstLesson = sections?.[0]?.lessons?.[0];
                  if (firstLesson) navigate(`/lessons/${firstLesson.id}`);
                }}
              >
                <Play className="mr-2 h-4 w-4" /> Продолжить обучение
              </Button>
            ) : (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => user ? enrollMutation.mutate() : navigate("/auth")}
                disabled={enrollMutation.isPending}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {user ? "Записаться на курс" : "Войдите чтобы записаться"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        <h2 className="text-2xl font-bold">Программа курса</h2>
        {sections?.length ? (
          <div className="space-y-4">
            {sections.map((section, si) => (
              <Card key={section.id} className="shadow-card">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-lg">
                    {si + 1}. {section.title}
                  </h3>
                  {section.description && (
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  )}
                  <div className="space-y-1">
                    {(section.lessons as any[])
                      ?.sort((a: any, b: any) => a.position - b.position)
                      .map((lesson: any, li: number) => {
                        const Icon = typeIcons[lesson.content_type] || FileText;
                        return (
                          <button
                            key={lesson.id}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors text-left"
                            onClick={() => enrollment && navigate(`/lessons/${lesson.id}`)}
                            disabled={!enrollment}
                          >
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className={!enrollment ? "text-muted-foreground" : ""}>{si + 1}.{li + 1} {lesson.title}</span>
                          </button>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Содержание пока не добавлено</p>
        )}
      </div>
    </div>
  );
}
