import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  extractImageSources,
  isNonLocalSource,
  normalizeImageKey,
  parseImageReference,
  resolveRelativeSegments,
} from "../lib/localImages";
import type { EditorSource } from "../types";

/** DOM 补注入的防抖：Vditor 重渲染会成批替换节点，防抖避免逐节点触发。 */
const DOM_DEBOUNCE_MS = 80;
/** 内容变化的防抖：打字过程中不重复扫文本。 */
const SYNC_DEBOUNCE_MS = 600;

export type LocalImagesState = {
  /** 成功解析为 blob URL 的本地图片数 */
  resolvedCount: number;
  /** 检测到的本地相对图片引用数（不含外链与站内绝对路径，故不会虚高） */
  totalCount: number;
};

/** 统计结果连同它所属的目录一起存：换文档后天然失效，无需在 effect 里重置。 */
type CountsState = LocalImagesState & { dirKey: string | null };

const EMPTY_COUNTS: CountsState = {
  dirKey: null,
  resolvedCount: 0,
  totalCount: 0,
};

type UseLocalImagesArgs = {
  source: EditorSource;
  markdown: string;
  hostRef: RefObject<HTMLDivElement | null>;
  readImageBlob: (path: string[]) => Promise<Blob | null>;
  /** 笔记库句柄版本：授权 / 换目录后变化，用于「文档已打开后才授权」时补解析。 */
  libraryVersion: number;
};

/**
 * 把笔记里的本地相对路径图片渲染出来。
 *
 * 与线上图片的隔离是本 hook 的核心约束，共三道闸门：
 *   ① 抽取源文本时 isNonLocalSource 过滤；
 *   ② parseImageReference 再判一次；
 *   ③ 写入 DOM 前再判一次，且**只写 `srcset`，`src` 永不动**。
 * 因此 CDN / 外链 / 站内绝对路径 / data: / blob: 的 `src` 与 `srcset` 都保持原样。
 */
export function useLocalImages({
  source,
  markdown,
  hostRef,
  readImageBlob,
  libraryVersion,
}: UseLocalImagesArgs): LocalImagesState {
  // 笔记所在目录：既是解析相对路径的基准，也是防止跨笔记串图的边界。
  const dirKey =
    source.kind === "note" ? source.path.slice(0, -1).join("/") : null;

  const urlsRef = useRef<Map<string, string>>(new Map());
  const runIdRef = useRef(0);
  const immediateRef = useRef(true);
  const [counts, setCounts] = useState<CountsState>(EMPTY_COUNTS);

  const revokeAll = useCallback(() => {
    for (const url of urlsRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    urlsRef.current.clear();
  }, []);

  /** 把已解析的 blob 补注入到当前 DOM。只写 `srcset`，绝不改 `src`。 */
  const applyToDom = useCallback(() => {
    const host = hostRef.current;
    const urls = urlsRef.current;
    if (!host || urls.size === 0) {
      return;
    }

    for (const img of host.querySelectorAll("img[src]")) {
      const raw = img.getAttribute("src") ?? "";
      if (raw === "" || isNonLocalSource(raw)) {
        continue; // 闸门③：外链 / 站内绝对路径 / data: 一律不碰
      }

      const next = urls.get(normalizeImageKey(raw));
      if (!next) {
        continue;
      }

      const value = `${next} 1x`;
      if (img.getAttribute("srcset") === value) {
        continue; // 幂等：已注入则跳过，避免无谓的属性写入
      }

      img.setAttribute("srcset", value);
    }
  }, [hostRef]);

  /** 增量同步：已存在的 key 直接复用，不重新读盘、不重建 blob URL。 */
  const syncImages = useCallback(
    async (text: string, dirKeyToSync: string) => {
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      const dir = dirKeyToSync === "" ? [] : dirKeyToSync.split("/");
      const keys = new Set<string>();

      for (const src of extractImageSources(text)) {
        if (isNonLocalSource(src)) {
          continue; // 闸门①
        }

        const ref = parseImageReference(src); // 闸门②（内部再判一次非本地源）
        if (!ref) {
          continue;
        }

        const key = normalizeImageKey(src);
        keys.add(key);

        if (urlsRef.current.has(key)) {
          continue; // 增量：本 key 已有 blob URL，直接复用
        }

        const target = resolveRelativeSegments(dir, ref.segments);
        if (!target) {
          continue; // 越出授权根
        }

        const blob = await readImageBlob(target);

        if (runIdRef.current !== runId) {
          return; // 竞态：更新的同步已开始，本次结果作废
        }
        if (!blob) {
          continue; // 文件不存在或没有读权限，静默跳过
        }

        urlsRef.current.set(key, URL.createObjectURL(blob));
      }

      // 回收本轮未出现的 key（图片被删掉或路径被改掉）。
      for (const [key, url] of urlsRef.current) {
        if (keys.has(key)) {
          continue;
        }

        URL.revokeObjectURL(url);
        urlsRef.current.delete(key);
      }

      let resolvedCount = 0;
      for (const key of keys) {
        if (urlsRef.current.has(key)) {
          resolvedCount += 1;
        }
      }

      setCounts({ dirKey: dirKeyToSync, resolvedCount, totalCount: keys.size });
      applyToDom();
    },
    [applyToDom, readImageBlob],
  );

  // 切笔记 / 关文档 / 换目录：立刻清空，防止串图；卸载时兜底回收。
  useEffect(() => {
    revokeAll();
    immediateRef.current = true;

    return revokeAll;
  }, [dirKey, revokeAll]);

  // 内容变化 → 防抖增量同步；换文档后的第一次同步立即执行，避免图片闪一下才出现。
  // libraryVersion 变化（文档已打开后才授权目录）同样需要重新同步一次。
  useEffect(() => {
    if (dirKey === null) {
      return;
    }

    const delay = immediateRef.current ? 0 : SYNC_DEBOUNCE_MS;

    const timer = window.setTimeout(() => {
      immediateRef.current = false;
      void syncImages(markdown, dirKey);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [dirKey, libraryVersion, markdown, syncImages]);

  // Vditor 重渲染会新建 img 节点，观察后补注入。
  useEffect(() => {
    const host = hostRef.current;
    if (dirKey === null || !host) {
      return;
    }

    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        timer = null;
        applyToDom();
      }, DOM_DEBOUNCE_MS);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => {
      observer.disconnect();
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [applyToDom, dirKey, hostRef]);

  // 统计只在它所属目录仍是当前目录时有效：换笔记 / 打开线上文章即刻归零。
  return counts.dirKey === dirKey ? counts : EMPTY_COUNTS;
}
