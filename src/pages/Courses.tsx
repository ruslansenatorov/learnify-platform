import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CourseCard from "@/components/CourseCard";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

export default function Courses() {
  const [search, setSearch] = useState("");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch teacher names separately
      const teacherIds = [...new Set(data.map(c => c.teacher_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", teacherIds);
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
      return data.map(c => ({ ...c, profiles: profileMap[c.teacher_id] ?? null }));
    },
  });

  const filtered = courses?.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-8 space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Каталог курсов</h1>
        <p className="text-muted-foreground">Найдите курс, который подходит именно вам</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск курсов..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered?.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Курсы не найдены</p>
          <p className="text-sm mt-1">Попробуйте изменить поиск</p>
        </div>
      )}
    </div>
  );
}
