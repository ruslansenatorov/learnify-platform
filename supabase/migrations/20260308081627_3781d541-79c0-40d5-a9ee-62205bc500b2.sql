
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price NUMERIC DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course sections (modules)
CREATE TABLE public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'video', 'code')),
  content JSONB DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('single_choice', 'multiple_choice', 'text_input', 'number_input', 'sorting', 'matching', 'fill_blank', 'code')),
  question TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- Lesson progress
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles
CREATE POLICY "Roles viewable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Courses
CREATE POLICY "Published courses visible to all" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "Teachers see own courses" ON public.courses FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (
  teacher_id = auth.uid() AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);
CREATE POLICY "Teachers can update own courses" ON public.courses FOR UPDATE TO authenticated USING (
  teacher_id = auth.uid() AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);
CREATE POLICY "Teachers can delete own courses" ON public.courses FOR DELETE TO authenticated USING (
  teacher_id = auth.uid() AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);

-- Course sections
CREATE POLICY "Sections visible with course" ON public.course_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published = true OR c.teacher_id = auth.uid()))
);
CREATE POLICY "Teachers insert sections" ON public.course_sections FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Teachers update sections" ON public.course_sections FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Teachers delete sections" ON public.course_sections FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
);

-- Lessons
CREATE POLICY "Lessons visible to enrolled or teacher" ON public.lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.course_sections cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.id = section_id AND (c.teacher_id = auth.uid() OR c.is_published = true)
  )
);
CREATE POLICY "Teachers insert lessons" ON public.lessons FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_sections cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.id = section_id AND c.teacher_id = auth.uid()
  )
);
CREATE POLICY "Teachers update lessons" ON public.lessons FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.course_sections cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.id = section_id AND c.teacher_id = auth.uid()
  )
);
CREATE POLICY "Teachers delete lessons" ON public.lessons FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.course_sections cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.id = section_id AND c.teacher_id = auth.uid()
  )
);

-- Quizzes
CREATE POLICY "Quizzes visible" ON public.quizzes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_sections cs ON cs.id = l.section_id
    JOIN public.courses c ON c.id = cs.course_id
    WHERE l.id = lesson_id AND (c.teacher_id = auth.uid() OR c.is_published = true)
  )
);
CREATE POLICY "Teachers insert quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_sections cs ON cs.id = l.section_id
    JOIN public.courses c ON c.id = cs.course_id
    WHERE l.id = lesson_id AND c.teacher_id = auth.uid()
  )
);
CREATE POLICY "Teachers update quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_sections cs ON cs.id = l.section_id
    JOIN public.courses c ON c.id = cs.course_id
    WHERE l.id = lesson_id AND c.teacher_id = auth.uid()
  )
);
CREATE POLICY "Teachers delete quizzes" ON public.quizzes FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_sections cs ON cs.id = l.section_id
    JOIN public.courses c ON c.id = cs.course_id
    WHERE l.id = lesson_id AND c.teacher_id = auth.uid()
  )
);

-- Enrollments
CREATE POLICY "Users see own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can enroll" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Teachers see course enrollments" ON public.enrollments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
);

-- Lesson progress
CREATE POLICY "Users see own progress" ON public.lesson_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert progress" ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update progress" ON public.lesson_progress FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Quiz attempts
CREATE POLICY "Users see own attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can attempt" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Teachers see course attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.course_sections cs ON cs.id = l.section_id
    JOIN public.courses c ON c.id = cs.course_id
    WHERE q.id = quiz_id AND c.teacher_id = auth.uid()
  )
);
