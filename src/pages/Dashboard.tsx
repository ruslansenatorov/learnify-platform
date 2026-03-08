import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, BookOpen, Users, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["my-courses-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "beginner",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: form.title,
          description: form.description,
          category: form.category || null,
          difficulty: form.difficulty,
          teacher_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Курс создан!");
      queryClient.invalidateQueries({ queryKey: ["my-courses-dashboard"] });
      setShowCreate(false);
      setForm({ title: "", description: "", category: "", difficulty: "beginner" });
      navigate(`/dashboard/courses/${data.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-courses-dashboard"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Курс удалён");
      queryClient.invalidateQueries({ queryKey: ["my-courses-dashboard"] });
    },
  });

  if (!hasRole("teacher") && !hasRole("admin")) {
    return (
      <div className="container py-16 text-center space-y-4">
        <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto" />
        <p className="text-lg text-muted-foreground">У вас нет прав преподавателя</p>
        <p className="text-sm text-muted-foreground">Обратитесь к администратору</p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Управление курсами</h1>
          <p className="text-muted-foreground">Создавайте и редактируйте свои курсы</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Новый курс
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать курс</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Введение в Python" />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Описание курса..." />
              </div>
              <div className="space-y-2">
                <Label>Категория</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Программирование" />
              </div>
              <div className="space-y-2">
                <Label>Уровень</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Начальный</SelectItem>
                    <SelectItem value="intermediate">Средний</SelectItem>
                    <SelectItem value="advanced">Продвинутый</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending} className="w-full gradient-primary text-primary-foreground">
                Создать
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : courses?.length ? (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card key={course.id} className="shadow-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg gradient-hero flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{course.title}</h3>
                    <p className="text-sm text-muted-foreground">{course.category ?? "Без категории"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`pub-${course.id}`} className="text-sm text-muted-foreground">
                      {course.is_published ? "Опубликован" : "Черновик"}
                    </Label>
                    <Switch
                      id={`pub-${course.id}`}
                      checked={course.is_published ?? false}
                      onCheckedChange={(checked) => togglePublish.mutate({ id: course.id, published: checked })}
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => navigate(`/dashboard/courses/${course.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => {
                    if (confirm("Удалить курс?")) deleteMutation.mutate(course.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg">У вас пока нет курсов</p>
          <p className="text-sm">Создайте первый курс, нажав кнопку выше</p>
        </div>
      )}
    </div>
  );
}
