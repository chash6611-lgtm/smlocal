
import { Memo, UserProfile } from '../types.ts';

const MEMOS_FILE = 'memos.json';
const PROFILE_FILE = 'profile.json';

export async function getDirectoryHandle(): Promise<{ handle: FileSystemDirectoryHandle | null, error?: string }> {
  // Fix: Access experimental showDirectoryPicker by casting window to any to avoid TypeScript property error.
  if (!(window as any).showDirectoryPicker) {
    return { handle: null, error: '이 브라우저는 폴더 접근 기능을 지원하지 않습니다. 최신 크롬/엣지를 사용해주세요.' };
  }

  try {
    // @ts-ignore
    const handle = await (window as any).showDirectoryPicker({
      id: 'smartmemo-root',
      mode: 'readwrite',
      startIn: 'documents'
    });
    return { handle };
  } catch (err: any) {
    if (err.name === 'SecurityError') {
      return { handle: null, error: '보안 정책상 현재 화면(프레임)에서는 폴더를 열 수 없습니다. "새 탭"에서 앱을 열어주세요.' };
    }
    if (err.name === 'AbortError') {
      return { handle: null };
    }
    return { handle: null, error: '폴더를 여는 중 오류가 발생했습니다: ' + err.message };
  }
}

async function writeFile(directoryHandle: FileSystemDirectoryHandle, fileName: string, content: string) {
  try {
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (err) {
    console.error(`파일 쓰기 실패 (${fileName}):`, err);
  }
}

async function readFile(directoryHandle: FileSystemDirectoryHandle, fileName: string): Promise<string | null> {
  try {
    const fileHandle = await directoryHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (err) {
    return null;
  }
}

export const fileStorage = {
  async saveMemos(handle: FileSystemDirectoryHandle, memos: Memo[]) {
    await writeFile(handle, MEMOS_FILE, JSON.stringify(memos, null, 2));
  },
  
  async loadMemos(handle: FileSystemDirectoryHandle): Promise<Memo[]> {
    const content = await readFile(handle, MEMOS_FILE);
    return content ? JSON.parse(content) : [];
  },

  async saveProfile(handle: FileSystemDirectoryHandle, profile: UserProfile) {
    await writeFile(handle, PROFILE_FILE, JSON.stringify(profile, null, 2));
  },

  async loadProfile(handle: FileSystemDirectoryHandle): Promise<UserProfile | null> {
    const content = await readFile(handle, PROFILE_FILE);
    return content ? JSON.parse(content) : null;
  }
};
