import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * @description يفحص محركات macOS المتاحة في /Volumes ويستبعد القرص الرئيسي بمقارنة رقم الجهاز (device id)
 * @returns {string[]} مسارات المحركات الخارجية المحتملة
 */
function listMacVolumes(): string[] {
  const root = '/Volumes';
  if (!fs.existsSync(root)) return [];

  let bootDev: number | undefined;
  try {
    bootDev = fs.statSync('/').dev;
  } catch {
    bootDev = undefined;
  }

  return fs
    .readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((volumePath) => {
      try {
        return bootDev === undefined || fs.statSync(volumePath).dev !== bootDev;
      } catch {
        return false;
      }
    });
}

/**
 * @description يفحص نقاط تركيب المحركات القابلة للإزالة على لينكس (media / run/media)
 * @returns {string[]} مسارات المحركات الخارجية المحتملة
 */
function listLinuxVolumes(): string[] {
  const username = os.userInfo().username;
  const bases = [`/media/${username}`, `/run/media/${username}`];
  const mounts: string[] = [];

  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)) {
      mounts.push(path.join(base, name));
    }
  }

  return mounts;
}

/**
 * @description يفحص محركات الأقراص القابلة للإزالة على ويندوز عبر wmic (drivetype=2)
 * @returns {string[]} مسارات المحركات الخارجية المحتملة (مثل "E:\\")
 */
function listWindowsVolumes(): string[] {
  try {
    const output = execSync('wmic logicaldisk where drivetype=2 get caption', { encoding: 'utf8' });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^[A-Z]:$/.test(line))
      .map((drive) => `${drive}\\`);
  } catch {
    return [];
  }
}

/**
 * @description يتحقق فعلياً من إمكانية الكتابة على مسار معين بكتابة وحذف ملف تجريبي
 * @param {string} dirPath - المسار المراد فحصه
 * @returns {boolean} true لو المسار قابل للكتابة فعلاً
 */
function isWritable(dirPath: string): boolean {
  const probePath = path.join(dirPath, `.clinixa-write-check-${Date.now()}`);
  try {
    fs.writeFileSync(probePath, 'ok');
    fs.unlinkSync(probePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @description يكتشف أول محرك USB متصل وقابل للكتابة فعلياً على نظام التشغيل الحالي (macOS / Linux / Windows)
 * @returns {string | null} المسار الكامل لجذر المحرك الجاهز للكتابة، أو null لو مفيش محرك خارجي متاح
 */
export function detectWritableUsbDrive(): string | null {
  let candidates: string[] = [];

  if (process.platform === 'darwin') candidates = listMacVolumes();
  else if (process.platform === 'linux') candidates = listLinuxVolumes();
  else if (process.platform === 'win32') candidates = listWindowsVolumes();

  return candidates.find((candidate) => isWritable(candidate)) ?? null;
}
