import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Award, Code, Users } from "lucide-react";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="gradient-hero py-20 md:py-32">
        <div className="container text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground leading-tight max-w-3xl mx-auto">
            Учитесь новому.<br />Развивайтесь каждый день.
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 max-w-xl mx-auto">
            Интерактивные курсы с тестами, видео и задачами на код. Начните обучение бесплатно.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/courses">Смотреть курсы</Link>
            </Button>
            {!user && (
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/auth">Создать аккаунт</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Всё для эффективного обучения</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, title: "Текстовые уроки", desc: "Структурированный материал с примерами" },
              { icon: Code, title: "Задачи на код", desc: "Практикуйтесь прямо в браузере" },
              { icon: Award, title: "Тесты и квизы", desc: "Проверяйте знания после каждого урока" },
              { icon: Users, title: "Для всех уровней", desc: "От начинающих до продвинутых" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center space-y-3 p-6 rounded-xl bg-card shadow-card border border-border hover:shadow-elevated transition-shadow">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted">
        <div className="container text-center space-y-4">
          <h2 className="text-2xl font-bold">Готовы начать?</h2>
          <p className="text-muted-foreground">Присоединяйтесь к платформе и начните обучение уже сегодня</p>
          <Button size="lg" className="gradient-primary text-primary-foreground" asChild>
            <Link to={user ? "/courses" : "/auth"}>
              {user ? "Перейти к курсам" : "Зарегистрироваться бесплатно"}
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>LearnHub</span>
          </div>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
