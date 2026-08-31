import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⚠ بورت ثابت ومش بيقفز لو مشغول — عشان الـ origin يفضل نفسه بين كل فتح
  // وقفل للتطبيق. من غيره، Vite بيختار بورت تاني بصمت لو ٥١٧٣ مشغول
  // (٥١٧٤، ٥١٧٥...)، وكل بورت = origin مختلف = localStorage منفصل تمامًا
  // (زي علامة setup_complete وتوكن الجلسة) — فبيبان وكأن البيانات المحفوظة
  // "بتضيع" بين مرة وتانية، مع إنها فعليًا لسه محفوظة على القرص تحت origin
  // قديم مش بيتفتح تاني. `strictPort` بيوقف بخطأ واضح بدل القفز الصامت.
  server: {
    port: 5173,
    strictPort: true,
  },
  // ⚠ @clinixa/shared هو حزمة CJS متصلة بـ npm workspaces (symlink) — من
  // غير الإدراج الصريح ده، Vite بيخدمها مباشرة عن طريق /@fs/ بدل ما يعمل
  // Pre-bundle ليها، والتحليل التلقائي لصادراتها الاسمية (زي LAB_STATUSES)
  // بيفشل جزئيًا فبيرمي "does not provide an export named ..." وقت التشغيل.
  optimizeDeps: {
    include: ['@clinixa/shared'],
  },
})
