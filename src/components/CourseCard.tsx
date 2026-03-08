import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Signal } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface CourseCardProps {
  course: Tables<"courses"> & { profiles?: { display_name: string | null } | null };
}

const difficultyLabels: Record<string, string> = {
  beginner: "Начальный",
  intermediate: "Средний",
  advanced: "Продвинутый",
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-success/10 text-success border-success/20",
  intermediate: "bg-warning/10 text-warning border-warning/20",
  advanced: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <Link to={`/courses/${course.id}`}>
      <Card className="group overflow-hidden border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-video bg-muted relative overflow-hidden">
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center gradient-hero">
              <BookOpen className="h-12 w-12 text-primary-foreground/40" />
            </div>
          )}
          {course.difficulty && (
            <Badge
              variant="outline"
              className={`absolute top-3 right-3 ${difficultyColors[course.difficulty] ?? ""}`}
            >
              <Signal className="mr-1 h-3 w-3" />
              {difficultyLabels[course.difficulty] ?? course.difficulty}
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            {course.profiles?.display_name && (
              <span>{course.profiles.display_name}</span>
            )}
            {course.category && <Badge variant="secondary" className="text-xs">{course.category}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
