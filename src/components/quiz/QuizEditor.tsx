import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { HelpCircle, Plus, Trash2 } from "lucide-react";

interface QuizEditorProps {
  lessonId: string;
  quizzes: any[];
}

const quizTypes = [
  { value: "single_choice", label: "Один ответ" },
  { value: "multiple_choice", label: "Несколько ответов" },
  { value: "text_input", label: "Текстовый ввод" },
  { value: "number_input", label: "Числовой ввод" },
  { value: "sorting", label: "Сортировка" },
];

export default function QuizEditor({ lessonId, quizzes }: QuizEditorProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    question: "",
    quiz_type: "single_choice",
    options: ["", ""],
    correct_answer: "" as any,
    explanation: "",
  });

  const resetForm = () => setForm({
    title: "",
    question: "",
    quiz_type: "single_choice",
    options: ["", ""],
    correct_answer: "",
    explanation: "",
  });

  const addQuiz = useMutation({
    mutationFn: async () => {
      let correctAnswer: any = form.correct_answer;
      let options: any = form.options.filter(Boolean);

      if (form.quiz_type === "multiple_choice") {
        correctAnswer = typeof form.correct_answer === "string"
          ? form.correct_answer.split(",").map((s: string) => s.trim())
          : form.correct_answer;
      } else if (form.quiz_type === "sorting") {
        correctAnswer = options; // correct order is the options order
      }

      const { error } = await supabase.from("quizzes").insert({
        lesson_id: lessonId,
        title: form.title || form.question.slice(0, 50),
        question: form.question,
        quiz_type: form.quiz_type,
        options,
        correct_answer: correctAnswer,
        explanation: form.explanation || null,
        position: quizzes.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Тест добавлен");
      resetForm();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["edit-sections"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edit-sections"] }),
  });

  const needsOptions = ["single_choice", "multiple_choice", "sorting"].includes(form.quiz_type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 text-xs gap-1">
          <HelpCircle className="h-3 w-3" />
          {quizzes.length > 0 ? `(${quizzes.length})` : "Тесты"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Тесты к уроку</DialogTitle>
        </DialogHeader>

        {/* Existing quizzes */}
        {quizzes.length > 0 && (
          <div className="space-y-2 mb-4">
            {quizzes.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                <span className="truncate">{q.question}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => deleteQuiz.mutate(q.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new quiz */}
        <div className="space-y-4 border-t border-border pt-4">
          <h4 className="font-medium text-sm">Добавить тест</h4>
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={form.quiz_type} onValueChange={(v) => setForm({ ...form, quiz_type: v, correct_answer: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {quizTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Вопрос</Label>
            <Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Какой результат выполнения кода?" />
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <Label>Варианты ответов</Label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...form.options];
                      opts[i] = e.target.value;
                      setForm({ ...form, options: opts });
                    }}
                    placeholder={`Вариант ${i + 1}`}
                  />
                  {form.options.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() =>
                      setForm({ ...form, options: form.options.filter((_, j) => j !== i) })
                    }>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
                <Plus className="h-3 w-3 mr-1" /> Добавить вариант
              </Button>
            </div>
          )}

          {form.quiz_type === "single_choice" && (
            <div className="space-y-2">
              <Label>Правильный ответ (введите текст варианта)</Label>
              <Input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} />
            </div>
          )}
          {form.quiz_type === "multiple_choice" && (
            <div className="space-y-2">
              <Label>Правильные ответы (через запятую)</Label>
              <Input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} placeholder="Ответ 1, Ответ 2" />
            </div>
          )}
          {(form.quiz_type === "text_input" || form.quiz_type === "number_input") && (
            <div className="space-y-2">
              <Label>Правильный ответ</Label>
              <Input
                type={form.quiz_type === "number_input" ? "number" : "text"}
                value={form.correct_answer}
                onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
              />
            </div>
          )}
          {form.quiz_type === "sorting" && (
            <p className="text-sm text-muted-foreground">Правильный порядок = порядок вариантов выше</p>
          )}

          <div className="space-y-2">
            <Label>Объяснение (опционально)</Label>
            <Textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
          </div>

          <Button
            onClick={() => addQuiz.mutate()}
            disabled={!form.question || addQuiz.isPending}
            className="w-full gradient-primary text-primary-foreground"
          >
            Добавить тест
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
