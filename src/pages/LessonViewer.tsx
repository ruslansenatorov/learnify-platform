import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import QuizRenderer from "@/components/quiz/QuizRenderer";

export default function LessonViewer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lesson } = useQuery({
    queryKey: ["lesson", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, course_sections(id, course_id, title)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: quizzes } = useQuery({
    queryKey: ["lesson-quizzes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("lesson_id", id!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  // Get sibling lessons for navigation
  const { data: siblings } = useQuery({
    queryKey: ["sibling-lessons", lesson?.section_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, position")
        .eq("section_id", lesson!.section_id)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!lesson?.section_id,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: id!,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Урок завершён!");
      queryClient.invalidateQueries({ queryKey: ["lesson-progress", id] });
    },
  });

  if (!lesson) return <div className="container py-8"><div className="h-64 bg-muted rounded-lg animate-pulse" /></div>;

  const currentIdx = siblings?.findIndex((s) => s.id === id) ?? -1;
  const prevLesson = currentIdx > 0 ? siblings?.[currentIdx - 1] : null;
  const nextLesson = siblings && currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;
  const content = lesson.content as any;

  return (
    <div className="container max-w-4xl py-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate(-1)} className="hover:text-foreground transition-colors">
          ← Назад
        </button>
        <span>/</span>
        <span>{(lesson.course_sections as any)?.title}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        {progress?.completed ? (
          <span className="flex items-center gap-1 text-sm text-success font-medium">
            <CheckCircle2 className="h-4 w-4" /> Завершён
          </span>
        ) : (
          <Button size="sm" variant="outline" onClick={() => completeMutation.mutate()}>
            Отметить как пройденный
          </Button>
        )}
      </div>

      {/* Lesson content */}
      <Card className="shadow-card">
        <CardContent className="p-6 prose prose-sm max-w-none">
          {lesson.content_type === "video" && content?.video_url ? (
            <div className="aspect-video">
              <iframe
                src={toEmbedUrl(content.video_url)}
                className="w-full h-full rounded-lg"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : lesson.content_type === "code" ? (
            <div className="space-y-4">
              {content?.description && <p>{content.description}</p>}
              {content?.code && (
                <pre className="bg-sidebar text-sidebar-foreground p-4 rounded-lg overflow-x-auto font-mono text-sm">
                  <code>{content.code}</code>
                </pre>
              )}
            </div>
          ) : (
            <div>
              {content?.text ? (
                <div dangerouslySetInnerHTML={{ __html: content.text }} />
              ) : (
                <p className="text-muted-foreground">Содержание урока пока не добавлено</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quizzes */}
      {quizzes?.length ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Проверьте себя</h2>
          {quizzes.map((quiz) => (
            <QuizRenderer key={quiz.id} quiz={quiz} />
          ))}
        </div>
      ) : null}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        {prevLesson ? (
          <Button variant="outline" onClick={() => navigate(`/lessons/${prevLesson.id}`)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> {prevLesson.title}
          </Button>
        ) : <div />}
        {nextLesson ? (
          <Button variant="outline" onClick={() => navigate(`/lessons/${nextLesson.id}`)}>
            {nextLesson.title} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
