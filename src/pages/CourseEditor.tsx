import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, FileText, Play, Code, ChevronLeft } from "lucide-react";
import QuizEditor from "@/components/quiz/QuizEditor";

export default function CourseEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: course } = useQuery({
    queryKey: ["edit-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: sections } = useQuery({
    queryKey: ["edit-sections", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*, lessons(*, quizzes(*))")
        .eq("course_id", courseId!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Section management
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const addSection = useMutation({
    mutationFn: async () => {
      const pos = (sections?.length ?? 0);
      const { error } = await supabase.from("course_sections").insert({
        course_id: courseId!,
        title: newSectionTitle,
        position: pos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewSectionTitle("");
      queryClient.invalidateQueries({ queryKey: ["edit-sections", courseId] });
      toast.success("Раздел добавлен");
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edit-sections", courseId] }),
  });

  // Lesson management
  const [addLessonTo, setAddLessonTo] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: "", content_type: "text" as string });

  const addLesson = useMutation({
    mutationFn: async (sectionId: string) => {
      const section = sections?.find((s) => s.id === sectionId);
      const pos = (section?.lessons as any[])?.length ?? 0;
      const { error } = await supabase.from("lessons").insert({
        section_id: sectionId,
        title: lessonForm.title,
        content_type: lessonForm.content_type,
        position: pos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddLessonTo(null);
      setLessonForm({ title: "", content_type: "text" });
      queryClient.invalidateQueries({ queryKey: ["edit-sections", courseId] });
      toast.success("Урок добавлен");
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edit-sections", courseId] }),
  });

  // Lesson content editing
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonContent, setLessonContent] = useState<any>({});

  const saveLessonContent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lessons")
        .update({ content: lessonContent })
        .eq("id", editingLesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingLesson(null);
      queryClient.invalidateQueries({ queryKey: ["edit-sections", courseId] });
      toast.success("Содержание сохранено");
    },
  });

  const typeIcons: Record<string, any> = { text: FileText, video: Play, code: Code };

  if (!course) return <div className="container py-8"><div className="h-64 bg-muted rounded-lg animate-pulse" /></div>;

  return (
    <div className="container max-w-4xl py-8 space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-1">
        <ChevronLeft className="h-4 w-4" /> Назад к курсам
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="text-muted-foreground">Редактирование структуры курса</p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections?.map((section, si) => (
          <Card key={section.id} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {si + 1}. {section.title}
                </CardTitle>
                <div className="flex gap-1">
                  <Dialog open={addLessonTo === section.id} onOpenChange={(o) => setAddLessonTo(o ? section.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" /> Урок</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Добавить урок</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Название</Label>
                          <Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Тип контента</Label>
                          <Select value={lessonForm.content_type} onValueChange={(v) => setLessonForm({ ...lessonForm, content_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Текст</SelectItem>
                              <SelectItem value="video">Видео</SelectItem>
                              <SelectItem value="code">Код</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={() => addLesson.mutate(section.id)} disabled={!lessonForm.title} className="w-full gradient-primary text-primary-foreground">
                          Добавить
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                    if (confirm("Удалить раздел?")) deleteSection.mutate(section.id);
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {(section.lessons as any[])
                ?.sort((a: any, b: any) => a.position - b.position)
                .map((lesson: any, li: number) => {
                  const Icon = typeIcons[lesson.content_type] || FileText;
                  return (
                    <div key={lesson.id} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 group">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{si + 1}.{li + 1} {lesson.title}</span>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 text-xs" onClick={() => {
                        setEditingLesson(lesson);
                        setLessonContent(lesson.content || {});
                      }}>
                        Редактировать
                      </Button>
                      <QuizEditor lessonId={lesson.id} quizzes={lesson.quizzes ?? []} />
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => {
                        if (confirm("Удалить урок?")) deleteLesson.mutate(lesson.id);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              {!(section.lessons as any[])?.length && (
                <p className="text-sm text-muted-foreground px-3 py-2">Нет уроков</p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Add section */}
        <Card className="shadow-card border-dashed">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Название нового раздела..."
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
              />
              <Button onClick={() => addSection.mutate()} disabled={!newSectionTitle || addSection.isPending} className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lesson content editor dialog */}
      <Dialog open={!!editingLesson} onOpenChange={(o) => !o && setEditingLesson(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать: {editingLesson?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingLesson?.content_type === "video" && (
              <div className="space-y-2">
                <Label>URL видео (YouTube, Vimeo или embed-ссылка)</Label>
                <Input
                  value={lessonContent.video_url ?? ""}
                  onChange={(e) => setLessonContent({ ...lessonContent, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... или https://youtu.be/..."
                />
                <p className="text-xs text-muted-foreground">Поддерживаются обычные ссылки YouTube и Vimeo — они автоматически конвертируются</p>
              </div>
            )}
            {editingLesson?.content_type === "code" && (
              <>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    value={lessonContent.description ?? ""}
                    onChange={(e) => setLessonContent({ ...lessonContent, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Код</Label>
                  <Textarea
                    value={lessonContent.code ?? ""}
                    onChange={(e) => setLessonContent({ ...lessonContent, code: e.target.value })}
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>
              </>
            )}
            {editingLesson?.content_type === "text" && (
              <div className="space-y-2">
                <Label>Текст (HTML)</Label>
                <Textarea
                  value={lessonContent.text ?? ""}
                  onChange={(e) => setLessonContent({ ...lessonContent, text: e.target.value })}
                  className="min-h-[300px]"
                  placeholder="<h2>Заголовок</h2><p>Содержание урока...</p>"
                />
              </div>
            )}
            <Button
              onClick={() => saveLessonContent.mutate()}
              disabled={saveLessonContent.isPending}
              className="w-full gradient-primary text-primary-foreground"
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
