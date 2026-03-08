import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Users, BookOpen, Trash2, Eye, ShieldCheck, GraduationCap, UserCog, Play, FileText, Code } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Database } from "@/integrations/supabase/types";

function toEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

type AppRole = Database["public"]["Enums"]["app_role"];

export default function AdminPanel() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewingCourseId, setViewingCourseId] = useState<string | null>(null);
  // Fetch all users with their roles and profiles
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map<string, AppRole[]>();
      rolesRes.data.forEach((r) => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      });

      return profilesRes.data.map((p) => ({
        ...p,
        roles: rolesMap.get(p.user_id) || [],
      }));
    },
    enabled: !!user && hasRole("admin"),
  });

  // Fetch all courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, enrollments(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && hasRole("admin"),
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Роль добавлена");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Роль удалена");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Toggle course publish
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Статус обновлён");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
  });

  // Delete course
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Курс удалён");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
  });

  if (!hasRole("admin")) {
    return (
      <div className="container py-16 text-center space-y-4">
        <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
        <p className="text-lg text-muted-foreground">Доступ запрещён</p>
        <p className="text-sm text-muted-foreground">Только администраторы могут просматривать эту страницу</p>
      </div>
    );
  }

  const roleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "teacher": return "default" as const;
      case "student": return "secondary" as const;
    }
  };

  const roleLabel = (role: AppRole) => {
    switch (role) {
      case "admin": return "Админ";
      case "teacher": return "Преподаватель";
      case "student": return "Студент";
    }
  };

  return (
    <div className="container py-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Админ-панель</h1>
          <p className="text-muted-foreground">Управление пользователями и курсами</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{usersData?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Пользователей</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{courses?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Курсов</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {usersData?.filter((u) => u.roles.includes("teacher")).length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Преподавателей</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <UserCog className="h-4 w-4" /> Пользователи
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-1.5">
            <BookOpen className="h-4 w-4" /> Курсы
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Управление пользователями</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Роли</TableHead>
                      <TableHead>Дата регистрации</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.display_name || "Без имени"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {u.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={roleBadgeVariant(role)}
                                className="cursor-pointer"
                                onClick={() => {
                                  if (u.user_id === user?.id && role === "admin") {
                                    toast.error("Нельзя удалить свою роль админа");
                                    return;
                                  }
                                  if (confirm(`Удалить роль "${roleLabel(role)}"?`)) {
                                    removeRoleMutation.mutate({ userId: u.user_id, role });
                                  }
                                }}
                              >
                                {roleLabel(role)} ✕
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("ru-RU")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            onValueChange={(role: AppRole) => {
                              if (u.roles.includes(role)) {
                                toast.error("Роль уже назначена");
                                return;
                              }
                              addRoleMutation.mutate({ userId: u.user_id, role });
                            }}
                          >
                            <SelectTrigger className="w-[160px] ml-auto">
                              <SelectValue placeholder="Добавить роль" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Студент</SelectItem>
                              <SelectItem value="teacher">Преподаватель</SelectItem>
                              <SelectItem value="admin">Админ</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Все курсы</CardTitle>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Записи</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses?.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell className="text-muted-foreground">{course.category || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {(course.enrollments as any)?.[0]?.count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={course.is_published ?? false}
                            onCheckedChange={(checked) =>
                              togglePublishMutation.mutate({ id: course.id, published: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title="Контент"
                            onClick={() => setViewingCourseId(course.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/courses/${course.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (confirm("Удалить курс?")) deleteCourseMutation.mutate(course.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CourseContentDialog courseId={viewingCourseId} onClose={() => setViewingCourseId(null)} />
    </div>
  );
}

function CourseContentDialog({ courseId, onClose }: { courseId: string | null; onClose: () => void }) {
  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-course-content", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*, lessons(*)")
        .eq("course_id", courseId!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const typeIcons: Record<string, any> = { text: FileText, video: Play, code: Code };

  return (
    <Dialog open={!!courseId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Содержимое курса</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {sections?.map((section, si) => (
              <div key={section.id} className="space-y-3">
                <h3 className="font-semibold text-lg">{si + 1}. {section.title}</h3>
                {(section.lessons as any[])
                  ?.sort((a: any, b: any) => a.position - b.position)
                  .map((lesson: any, li: number) => {
                    const Icon = typeIcons[lesson.content_type] || FileText;
                    const content = lesson.content as any;
                    return (
                      <div key={lesson.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{si + 1}.{li + 1} {lesson.title}</span>
                          <Badge variant="secondary" className="text-xs">{lesson.content_type}</Badge>
                        </div>
                        {lesson.content_type === "video" && content?.video_url && (
                          <div className="aspect-video">
                            {content.video_url.includes("course-videos") ? (
                              <video src={content.video_url} controls className="w-full h-full rounded-lg bg-black" />
                            ) : (
                              <iframe
                                src={toEmbedUrl(content.video_url)}
                                className="w-full h-full rounded-lg"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            )}
                          </div>
                        )}
                        {lesson.content_type === "text" && content?.text && (
                          <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: content.text }} />
                        )}
                        {lesson.content_type === "code" && content?.code && (
                          <pre className="bg-muted p-3 rounded-lg overflow-x-auto font-mono text-xs">
                            <code>{content.code}</code>
                          </pre>
                        )}
                        {!content?.video_url && !content?.text && !content?.code && (
                          <p className="text-xs text-muted-foreground">Контент не добавлен</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
            {!sections?.length && <p className="text-muted-foreground">Нет разделов</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}