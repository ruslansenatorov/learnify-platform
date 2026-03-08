import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface QuizRendererProps {
  quiz: Tables<"quizzes">;
}

export default function QuizRenderer({ quiz }: QuizRendererProps) {
  const { user } = useAuth();
  const [answer, setAnswer] = useState<any>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const options = (quiz.options as string[]) ?? [];
  const correctAnswer = quiz.correct_answer;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const isCorrect = checkAnswer();
      if (user) {
        await supabase.from("quiz_attempts").insert({
          user_id: user.id,
          quiz_id: quiz.id,
          answer: answer as any,
          is_correct: isCorrect,
        });
      }
      return isCorrect;
    },
    onSuccess: (isCorrect) => {
      setResult(isCorrect ? "correct" : "incorrect");
    },
  });

  const checkAnswer = (): boolean => {
    if (answer === null || answer === undefined) return false;
    
    switch (quiz.quiz_type) {
      case "single_choice":
        return answer === correctAnswer;
      case "multiple_choice": {
        const correct = (correctAnswer as string[]).sort();
        const given = ([...(answer as string[])]).sort();
        return JSON.stringify(correct) === JSON.stringify(given);
      }
      case "text_input":
      case "number_input":
        return String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
      case "sorting": {
        return JSON.stringify(answer) === JSON.stringify(correctAnswer);
      }
      default:
        return false;
    }
  };

  const handleReset = () => {
    setAnswer(null);
    setResult(null);
    setShowExplanation(false);
  };

  const resultBorderClass = result === "correct" ? "border-success" : result === "incorrect" ? "border-destructive" : "";

  return (
    <Card className={`shadow-card transition-colors ${resultBorderClass}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{quiz.question}</p>
            {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
          </div>
        </div>

        {/* Single choice */}
        {quiz.quiz_type === "single_choice" && (
          <RadioGroup
            value={answer ?? ""}
            onValueChange={setAnswer}
            disabled={result !== null}
            className="space-y-2"
          >
            {options.map((opt, i) => (
              <div key={i} className="flex items-center space-x-2 rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={opt} id={`${quiz.id}-${i}`} />
                <Label htmlFor={`${quiz.id}-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* Multiple choice */}
        {quiz.quiz_type === "multiple_choice" && (
          <div className="space-y-2">
            {options.map((opt, i) => {
              const selected = (answer as string[] | null)?.includes(opt) ?? false;
              return (
                <div key={i} className="flex items-center space-x-2 rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`${quiz.id}-${i}`}
                    checked={selected}
                    disabled={result !== null}
                    onCheckedChange={(checked) => {
                      const prev = (answer as string[]) ?? [];
                      setAnswer(checked ? [...prev, opt] : prev.filter((a: string) => a !== opt));
                    }}
                  />
                  <Label htmlFor={`${quiz.id}-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                </div>
              );
            })}
          </div>
        )}

        {/* Text/Number input */}
        {(quiz.quiz_type === "text_input" || quiz.quiz_type === "number_input") && (
          <Input
            type={quiz.quiz_type === "number_input" ? "number" : "text"}
            placeholder="Введите ваш ответ..."
            value={answer ?? ""}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={result !== null}
          />
        )}

        {/* Sorting */}
        {quiz.quiz_type === "sorting" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Расставьте в правильном порядке (нажимайте по порядку):</p>
            <div className="flex flex-wrap gap-2">
              {options
                .filter((opt) => !(answer as string[] | null)?.includes(opt))
                .map((opt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    disabled={result !== null}
                    onClick={() => setAnswer([...((answer as string[]) ?? []), opt])}
                  >
                    {opt}
                  </Button>
                ))}
            </div>
            {(answer as string[])?.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-md bg-muted/50 border border-border">
                {(answer as string[]).map((a: string, i: number) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => {
                    if (result) return;
                    setAnswer((answer as string[]).filter((_: string, idx: number) => idx !== i));
                  }}>
                    {i + 1}. {a}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          {result === null ? (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={answer === null || answer === "" || (Array.isArray(answer) && answer.length === 0) || submitMutation.isPending}
              className="gradient-primary text-primary-foreground"
            >
              Проверить
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {result === "correct" ? (
                  <span className="flex items-center gap-1 text-success font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Правильно!
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <XCircle className="h-4 w-4" /> Неправильно
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Попробовать снова
              </Button>
              {quiz.explanation && (
                <Button variant="ghost" size="sm" onClick={() => setShowExplanation(!showExplanation)}>
                  Объяснение
                </Button>
              )}
            </>
          )}
        </div>

        {showExplanation && quiz.explanation && (
          <div className="p-3 rounded-md bg-info/10 border border-info/20 text-sm">
            {quiz.explanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Need Badge import for sorting quiz
import { Badge } from "@/components/ui/badge";
