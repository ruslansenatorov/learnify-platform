import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as tus from "tus-js-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Film, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

interface VideoUploaderProps {
  currentUrl?: string;
  onUrlChange: (url: string) => void;
}

export default function VideoUploader({ currentUrl, onUrlChange }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [linkUrl, setLinkUrl] = useState(currentUrl || "");
  const uploadRef = useRef<tus.Upload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploadedVideo = currentUrl?.includes("course-videos");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Выберите видеофайл");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Необходимо войти в систему");
        setUploading(false);
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const fileName = `${crypto.randomUUID()}-${file.name}`;
      const bucketName = "course-videos";

      const upload = new tus.Upload(file, {
        endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName,
          objectName: fileName,
          contentType: file.type,
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks
        onError: (error) => {
          console.error("Upload error:", error);
          toast.error("Ошибка загрузки: " + error.message);
          setUploading(false);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(pct);
        },
        onSuccess: () => {
          const publicUrl = `https://${projectId}.supabase.co/storage/v1/object/public/${bucketName}/${fileName}`;
          onUrlChange(publicUrl);
          toast.success("Видео загружено!");
          setUploading(false);
          setProgress(100);
        },
      });

      uploadRef.current = upload;

      // Check for previous uploads to resume
      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      upload.start();
    } catch (err: any) {
      console.error(err);
      toast.error("Ошибка: " + err.message);
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    uploadRef.current?.abort();
    setUploading(false);
    setProgress(0);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue={isUploadedVideo ? "upload" : currentUrl ? "link" : "upload"}>
        <TabsList className="w-full">
          <TabsTrigger value="upload" className="flex-1 gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Загрузить файл
          </TabsTrigger>
          <TabsTrigger value="link" className="flex-1 gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" /> Ссылка
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-3 mt-3">
          {uploading ? (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Загрузка... {progress}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelUpload}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Не закрывайте страницу. При обрыве загрузка продолжится автоматически.
              </p>
            </div>
          ) : (
            <>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Film className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Нажмите или перетащите видеофайл</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV — до 5 ГБ</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          )}

          {currentUrl && isUploadedVideo && !uploading && (
            <div className="border rounded-lg overflow-hidden">
              <video src={currentUrl} controls className="w-full aspect-video bg-black" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="link" className="space-y-3 mt-3">
          <div className="space-y-2">
            <Label>URL видео (YouTube, Vimeo)</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... или https://youtu.be/..."
            />
            <p className="text-xs text-muted-foreground">Обычные ссылки автоматически конвертируются в embed</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onUrlChange(linkUrl);
                toast.success("Ссылка сохранена");
              }}
              disabled={!linkUrl}
            >
              Применить ссылку
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
