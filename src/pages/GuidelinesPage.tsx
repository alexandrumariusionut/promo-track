import { useEffect, useRef, useState, useMemo } from 'react';
import { Box, Button, Typography, CircularProgress, useTheme } from '@mui/material';
import OpenInNew from '@mui/icons-material/OpenInNew';
import DOMPurify from 'dompurify';
import dayjs from 'dayjs';
import { useOnboarding } from '../context/OnboardingContext';
import { loadWikiContent, WikiContent } from '../utils/wikiContent';

/**
 * Builds scoped CSS for the wiki content, adapting to light/dark mode.
 */
const getCSS = (dark: boolean) => {
  const text = dark ? '#e0e0e0' : '#232f3e';
  const bg = dark ? '#1e1e1e' : '#f5f5f5';
  const bgAlt = dark ? '#2a2a2a' : '#f8f9fa';
  const border = dark ? '#444' : '#ddd';
  const link = dark ? '#5ca8e0' : '#0073bb';
  const panelBg = dark ? '#2a2a2a' : '#f5f5f5';
  const cardBg = dark ? '#2a2a2a' : 'white';
  const subText = dark ? '#aaa' : '#666';
  const subText2 = dark ? '#888' : '#999';
  const tableTh = dark ? '#37474f' : '#232f3e';
  const sboxBg = dark ? '#37474f' : '#232f3e';
  const headingColor = dark ? '#e0e0e0' : '#232f3e';
  const tableRowHover = dark ? '#333' : '#eef4fa';
  const boxBorder = dark ? '#444' : '#e0e0e0';

  return `
.wiki-guidelines-content { font-family: 'Amazon Ember', Arial, sans-serif; color: ${text}; line-height: 1.7; max-width: 900px; }
.wiki-guidelines-content .hero-promo-banner img { width: 100%; height: auto; border-radius: 8px; }
.wiki-guidelines-content .box { background-color: ${bg}; border: 1px solid ${boxBorder}; border-radius: 8px; padding: 24px 28px; margin: 24px 0; }
.wiki-guidelines-content h2 { margin-top: 36px; margin-bottom: 16px; font-size: 1.75rem; font-weight: 700; color: ${headingColor}; border-bottom: 2px solid ${border}; padding-bottom: 8px; }
.wiki-guidelines-content h3 { margin-top: 24px; margin-bottom: 12px; font-size: 1.3rem; font-weight: 600; color: ${headingColor}; }
.wiki-guidelines-content h4 { margin-top: 16px; margin-bottom: 8px; font-size: 1.1rem; font-weight: 600; color: ${headingColor}; }
.wiki-guidelines-content h2 span span[style*="font-size:40px"] { font-size: 1.75rem !important; font-weight: 700; color: ${headingColor}; }
.wiki-guidelines-content h2 span span[style*="color: inherit"] { color: ${headingColor} !important; }
.wiki-guidelines-content p { line-height: 1.7; margin-bottom: 12px; }
.wiki-guidelines-content ul { padding-left: 24px; margin-bottom: 12px; }
.wiki-guidelines-content ol { padding-left: 24px; margin-bottom: 12px; }
.wiki-guidelines-content li { margin-bottom: 8px; line-height: 1.7; }
.wiki-guidelines-content a { color: ${link}; text-decoration: none; }
.wiki-guidelines-content a:hover { text-decoration: underline; }
.wiki-guidelines-content img { max-width: 100%; height: auto; border-radius: 4px; }
.wiki-guidelines-content img[alt="accept"], .wiki-guidelines-content img[alt="error"], .wiki-guidelines-content img[alt="exclamation"] { width: 16px; height: 16px; vertical-align: middle; margin-right: 4px; border-radius: 0; }
.wiki-guidelines-content .styled-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; border-radius: 8px; overflow: hidden; border: 1px solid ${border}; }
.wiki-guidelines-content .styled-table th { background-color: ${tableTh}; color: white; padding: 12px 16px; text-align: center; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.025em; }
.wiki-guidelines-content .styled-table td { padding: 12px 16px; border-bottom: 1px solid ${border}; text-align: center; }
.wiki-guidelines-content .styled-table tr:nth-child(even) { background-color: ${bgAlt}; }
.wiki-guidelines-content .styled-table tr:hover td { background-color: ${tableRowHover}; }
.wiki-guidelines-content table { width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid ${border}; border-radius: 8px; overflow: hidden; }
.wiki-guidelines-content table td, .wiki-guidelines-content table th { padding: 12px 16px; vertical-align: top; border-bottom: 1px solid ${border}; }
.wiki-guidelines-content table th { background-color: ${tableTh}; color: white; font-weight: 600; }
.wiki-guidelines-content table tr:nth-child(even) { background-color: ${bgAlt}; }
.wiki-guidelines-content .table-container { overflow-x: auto; margin: 16px 0; border-radius: 8px; }
.wiki-guidelines-content .icPromoSTAR { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin: 24px 0; }
.wiki-guidelines-content .STARcontainer { display: flex; align-items: flex-start; border-radius: 8px; padding: 16px; flex: 1; min-width: 200px; max-width: 280px; color: white; }
.wiki-guidelines-content .STARcontainer.SBox { background-color: ${sboxBg}; }
.wiki-guidelines-content .STARcontainer.TBox { background-color: #ff9900; }
.wiki-guidelines-content .STARcontainer.ABox { background-color: #146eb4; }
.wiki-guidelines-content .STARcontainer.RBox { background-color: #1a8a5c; }
.wiki-guidelines-content .STARInitial { font-size: 48px; font-weight: 700; margin-right: 12px; line-height: 1; }
.wiki-guidelines-content .STARContents h3 { margin: 0 0 8px 0; font-size: 16px; color: white; border: none; padding: 0; }
.wiki-guidelines-content .STARContents p { margin: 0; font-size: 13px; opacity: 0.9; color: white; }
.wiki-guidelines-content .panel-group { margin: 16px 0; }
.wiki-guidelines-content .panel { border: 1px solid ${border}; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
.wiki-guidelines-content .panel-heading { background-color: ${panelBg}; padding: 12px 16px; cursor: pointer; transition: background-color 0.15s ease; }
.wiki-guidelines-content .panel-heading:hover { background-color: ${dark ? '#333' : '#eee'}; }
.wiki-guidelines-content .panel-title { margin: 0; font-size: 14px; font-weight: 600; }
.wiki-guidelines-content .panel-title a { text-decoration: none; color: ${text}; display: block; }
.wiki-guidelines-content .panel-collapse { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.wiki-guidelines-content .panel-collapse.in { max-height: 5000px; }
.wiki-guidelines-content .panel-body { padding: 16px 20px; }
.wiki-guidelines-content .panel-description { font-size: 14px; line-height: 1.7; }
.wiki-guidelines-content .downloadBtn { margin: 16px 0; }
.wiki-guidelines-content .dlButton { background-color: #ff9900; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background-color 0.15s ease; }
.wiki-guidelines-content .dlButton:hover { background-color: #e88b00; }
.wiki-guidelines-content .leveling-table td:first-child { font-weight: 600; white-space: nowrap; width: 200px; background-color: ${bgAlt}; }
.wiki-guidelines-content .speaker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin: 20px 0; }
.wiki-guidelines-content .speaker-card { background: ${cardBg}; border: 1px solid ${border}; border-radius: 8px; padding: 16px; }
.wiki-guidelines-content .speaker-card h4 { margin: 0 0 4px 0; font-size: 15px; color: ${text}; }
.wiki-guidelines-content .speaker-card .speaker-title { font-size: 13px; color: ${subText}; margin-bottom: 4px; }
.wiki-guidelines-content .speaker-card .speaker-date { font-size: 13px; color: ${subText2}; margin-bottom: 8px; }
.wiki-guidelines-content .speaker-card a { font-size: 13px; }
.wiki-guidelines-content table[style*="background-color:#fff"], .wiki-guidelines-content table[style*="background: #fff"] { background-color: ${bg} !important; }
.wiki-guidelines-content table[style*="background-color:#fff"] th[style*="background-color:#fff"], .wiki-guidelines-content table[style*="background: #fff"] th[style*="background-color:#fff"] { background-color: ${bg} !important; }
.wiki-guidelines-content table[style*="background-color:#fff"] td, .wiki-guidelines-content table[style*="background: #fff"] td { color: ${text}; }
.wiki-guidelines-content div[style*="background-color:#fff"] { background-color: ${bg} !important; }
.wiki-guidelines-content table td, .wiki-guidelines-content table th { color: ${text}; }
.wiki-guidelines-content strong { color: ${text}; }
.wiki-guidelines-content blockquote { border-left: 4px solid ${link}; margin: 16px 0; padding: 12px 20px; background: ${bgAlt}; border-radius: 0 8px 8px 0; }
.wiki-guidelines-content code { background: ${bgAlt}; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.wiki-guidelines-content pre { background: ${bgAlt}; padding: 16px; border-radius: 8px; overflow-x: auto; }
.wiki-guidelines-content hr { border: none; border-top: 1px solid ${border}; margin: 24px 0; }`;
};

/**
 * Sanitizes the wiki HTML using DOMPurify with hooks to:
 * - Force all <a> tags to open in new tabs (target="_blank", rel="noopener noreferrer")
 * - Convert relative hrefs (starting with '/') to absolute wiki URLs
 */
function sanitizeWikiHTML(rawHTML: string): string {
  // Hook: after each element is sanitized, fix anchors for safe external linking
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
      // Convert wiki-relative hrefs to absolute URLs
      const href = node.getAttribute('href');
      if (href && href.startsWith('/')) {
        node.setAttribute('href', 'https://w.amazon.com' + href);
      }
    }
  });

  const clean = DOMPurify.sanitize(rawHTML, { ADD_ATTR: ['target'] });

  // Remove the hook after use to avoid stacking on re-renders
  DOMPurify.removeHook('afterSanitizeAttributes');

  return clean;
}

/**
 * Post-sanitization cleanup: removes wiki navigation chrome, empty spacer divs,
 * and restructures the layout table into just the content column.
 * Operates on the sanitized HTML string via a temporary DOM fragment.
 */
function cleanupWikiHTML(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;
  if (!root) return html;

  // Remove the GSD Managers Wiki navigation banner
  root.querySelectorAll('.gsde-navigation-box').forEach((el) => el.remove());

  // Remove the sticky navbar (wiki navigation)
  root.querySelectorAll('.sticky-nav').forEach((el) => el.remove());

  // Remove the wiki-generated TOC
  root.querySelectorAll('.amazon-wiki-toc').forEach((el) => el.remove());

  // Remove all wikimodel-emptyline spacer divs
  root.querySelectorAll('.wikimodel-emptyline').forEach((el) => el.remove());

  // Remove empty paragraphs that only contain &nbsp;
  root.querySelectorAll('p').forEach((p) => {
    if (p.textContent?.trim() === '' || p.innerHTML.trim() === '&nbsp;') {
      p.remove();
    }
  });

  // Remove empty padding divs (style="padding: 20px;") that only create whitespace
  root.querySelectorAll('div[style*="padding"]').forEach((div) => {
    if (div.children.length === 0 && div.textContent?.trim() === '') {
      div.remove();
    }
  });

  // Extract content from the layout table: the wiki uses a 2-column table
  // Left column = dark sidebar nav (background #04252c), Right column = actual content
  // We want to keep only the right column's content
  root.querySelectorAll('table').forEach((table) => {
    const firstTd = table.querySelector('td');
    if (firstTd && firstTd.style.backgroundColor === 'rgb(4, 37, 44)') {
      // This is the layout table. Extract the second td's content
      const tds = table.querySelectorAll(':scope > tbody > tr > td, :scope > tr > td');
      if (tds.length >= 2) {
        const contentTd = tds[1];
        // Replace the table with just the content
        const fragment = doc.createDocumentFragment();
        while (contentTd.firstChild) {
          fragment.appendChild(contentTd.firstChild);
        }
        table.replaceWith(fragment);
      } else if (tds.length === 1) {
        // Only the sidebar - remove entirely
        table.remove();
      }
    }
  });

  // Also catch sidebar td by checking for min-width:300px in style (alternative match)
  root.querySelectorAll('td[style*="min-width:300px"]').forEach((td) => {
    const table = td.closest('table');
    if (table) {
      const tds = table.querySelectorAll(':scope > tbody > tr > td, :scope > tr > td');
      if (tds.length >= 2) {
        const contentTd = tds[1];
        const fragment = doc.createDocumentFragment();
        while (contentTd.firstChild) {
          fragment.appendChild(contentTd.firstChild);
        }
        table.replaceWith(fragment);
      }
    }
  });

  // Remove broken images: images pointing to relative /bin/download/ paths
  // and images from internal-cdn.amazon.com (badge photos that 401 without cookies)
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (
      src.startsWith('/bin/') ||
      src.includes('internal-cdn.amazon.com') ||
      src.includes('badgephotos.amazon.com')
    ) {
      img.remove();
    }
  });

  // Hide images that fail to load (w.amazon.com may 401)
  root.querySelectorAll('img').forEach((img) => {
    img.setAttribute('onerror', "this.style.display='none'");
  });

  // Remove the badge/welcome card (sbBadge links)
  root.querySelectorAll('.sbBadge').forEach((el) => el.remove());
  root.querySelectorAll('a[class*="sbBadge"]').forEach((el) => el.remove());

  // Remove the sidebar menu headings and lists
  root.querySelectorAll('.icSBMenuHeading').forEach((el) => el.remove());
  root.querySelectorAll('.nav-pills').forEach((el) => el.remove());

  // Remove inline width/font-size styles that fight the theme on wrapper divs
  root.querySelectorAll('div[style*="padding:60px"]').forEach((div) => {
    (div as HTMLElement).style.padding = '0';
  });
  root.querySelectorAll('div[style*="padding: 60px"]').forEach((div) => {
    (div as HTMLElement).style.padding = '0';
  });

  // Remove inline border-width:0px styling on container divs
  root.querySelectorAll('[style*="border-width:0px"]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.removeProperty('border-width');
    }
  });

  // Strip excessive inline padding on remaining divs (20px spacers that are now empty)
  root.querySelectorAll('div[style*="padding: 20px"]').forEach((div) => {
    if (div instanceof HTMLElement && div.children.length === 0 && div.textContent?.trim() === '') {
      div.remove();
    }
  });

  // Clean up the img-banner and container divs that are now empty
  root.querySelectorAll('.img-banner').forEach((el) => {
    if (el.textContent?.trim() === '') el.remove();
  });
  root.querySelectorAll('.full-bleed').forEach((el) => {
    if (el.textContent?.trim() === '') el.remove();
  });

  // Remove wiki modal dialogs (peer review, feedback forms)
  root.querySelectorAll('.modal').forEach((el) => el.remove());
  root.querySelectorAll('[data-toggle="modal"]').forEach((el) => el.remove());

  // Remove the peccy-feedback button/link
  root.querySelectorAll('.peccy-feedback').forEach((el) => el.remove());

  // Remove wiki footer elements (close buttons from modals that may have leaked)
  root.querySelectorAll('button[data-dismiss="modal"]').forEach((el) => el.remove());

  // Remove the wiki page footer (ITSE Links, Other Links, Page Owner, etc.)
  root.querySelectorAll('footer').forEach((el) => el.remove());
  root.querySelectorAll('.footer-bs').forEach((el) => el.remove());

  // Remove the feedback section at the very end
  root.querySelectorAll('#feedback').forEach((el) => el.remove());
  root.querySelectorAll('#peerReview').forEach((el) => el.remove());
  root.querySelectorAll('.peer-review').forEach((el) => el.remove());
  root.querySelectorAll('.btnPeerReview').forEach((el) => el.remove());

  // Remove any remaining modal content (rendered as flat HTML after DOMPurify strips data attrs)
  root.querySelectorAll('.modal-content').forEach((el) => el.remove());
  root.querySelectorAll('.modal-dialog').forEach((el) => el.remove());
  root.querySelectorAll('.modal-body').forEach((el) => el.remove());
  root.querySelectorAll('.modal-footer').forEach((el) => el.remove());

  return root.innerHTML;
}

export default function GuidelinesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const { guidelinesRead, markGuidelinesRead } = useOnboarding();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [wiki, setWiki] = useState<WikiContent | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    loadWikiContent(ctrl.signal)
      .then(setWiki)
      .catch((e) => { if (!ctrl.signal.aborted) setLoadError(e instanceof Error ? e.message : 'Failed to load'); });
    return () => ctrl.abort();
  }, []);

  const WIKI_HTML = wiki?.html ?? '';
  const WIKI_SYNCED_AT = wiki?.syncedAt ?? '';
  const WIKI_SOURCE_URL = wiki?.sourceUrl ?? '';

  // Memoize sanitized HTML so DOMPurify only runs when the source changes
  const sanitizedHTML = useMemo(() => {
    if (!WIKI_HTML) return '';
    const sanitized = sanitizeWikiHTML(WIKI_HTML);
    return cleanupWikiHTML(sanitized);
  }, [WIKI_HTML]);

  useEffect(() => {
    if (guidelinesRead || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { markGuidelinesRead(); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [guidelinesRead, markGuidelinesRead]);

  useEffect(() => {
    if (guidelinesRead) return;
    const timer = setTimeout(() => setShowFallback(true), 30000);
    return () => clearTimeout(timer);
  }, [guidelinesRead]);

  useEffect(() => {
    if (!containerRef.current) return;
    // Fix all accordion links: remove href to prevent navigation, add cursor
    const links = containerRef.current.querySelectorAll('.accordion-toggle');
    links.forEach(link => {
      link.removeAttribute('href');
      (link as HTMLElement).style.cursor = 'pointer';
    });
    // Bind click to panel-heading for large click target
    const headings = containerRef.current.querySelectorAll('.panel-heading');
    const handlers: Array<[Element, (e: Event) => void]> = [];
    headings.forEach(heading => {
      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const panel = heading.closest('.panel');
        const collapse = panel?.querySelector('.panel-collapse');
        const toggle = heading.querySelector('.accordion-toggle');
        if (collapse) collapse.classList.toggle('in');
        if (toggle) toggle.classList.toggle('collapsed');
      };
      heading.addEventListener('click', handler);
      handlers.push([heading, handler]);
    });
    return () => { handlers.forEach(([el, h]) => el.removeEventListener('click', h)); };
  }, [sanitizedHTML]);

  if (!wiki && !loadError) {
    return (
      <Box role="status" aria-live="polite" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress aria-label="Loading guidelines" />
      </Box>
    );
  }

  // Empty state when wiki hasn't been synced yet or the asset is missing
  if (!WIKI_HTML) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>No Guidelines Content</Typography>
        <Typography color="text.secondary">
          {loadError ? `${loadError}. ` : ''}Run <code>npm run sync-wiki</code> to fetch guidelines from the IC Promotion Wiki.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>IC Promotion Guidelines</Typography>
          <Typography variant="caption" color="text.secondary">
            Synced from IC Promotion Wiki on {dayjs(WIKI_SYNCED_AT).format('MMMM D, YYYY [at] h:mm A')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          endIcon={<OpenInNew />}
          href={WIKI_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open live wiki
        </Button>
      </Box>

      {/* Wiki content */}
      <style>{getCSS(dark)}</style>
      <div
        ref={containerRef}
        className="wiki-guidelines-content"
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />
      <div ref={sentinelRef} style={{ height: 1 }} />
      {!guidelinesRead && showFallback && (
        <Button variant="outlined" onClick={markGuidelinesRead} sx={{ mt: 2 }}>
          ✅ Mark Guidelines as Read
        </Button>
      )}
    </Box>
  );
}
