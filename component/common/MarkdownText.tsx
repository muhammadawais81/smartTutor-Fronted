/**
 * MarkdownText
 *
 * A lightweight, dependency-free markdown renderer for React Native.
 * Designed to display AI assistant answers ChatGPT-style:
 *  - Headings (#, ##, ###)
 *  - Bold (**text**), italic (*text* / _text_), inline code (`code`)
 *  - Code blocks (```lang ... ```)
 *  - Ordered & unordered lists
 *  - Blockquotes (>)
 *  - Horizontal rules (---)
 *  - Links [text](url)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextStyle,
  Linking,
  ScrollView,
} from 'react-native';

interface MarkdownTextProps {
  content: string;
  color?: string;
}

type InlineSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
};

// ---------------------------------------------------------------------------
// Inline parsing: bold, italic, code, links
// ---------------------------------------------------------------------------
const parseInline = (text: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  let remaining = text;

  // Order matters: code first (so its content isn't re-parsed), then links, bold, italic.
  const patterns: {
    regex: RegExp;
    build: (m: RegExpExecArray) => InlineSegment;
  }[] = [
    {
      regex: /`([^`]+)`/,
      build: m => ({text: m[1], code: true}),
    },
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/,
      build: m => ({text: m[1], link: m[2]}),
    },
    {
      regex: /\*\*([^*]+)\*\*/,
      build: m => ({text: m[1], bold: true}),
    },
    {
      regex: /__([^_]+)__/,
      build: m => ({text: m[1], bold: true}),
    },
    {
      regex: /\*([^*]+)\*/,
      build: m => ({text: m[1], italic: true}),
    },
    {
      regex: /_([^_]+)_/,
      build: m => ({text: m[1], italic: true}),
    },
  ];

  while (remaining.length > 0) {
    let earliest: {
      index: number;
      length: number;
      segment: InlineSegment;
    } | null = null;

    for (const {regex, build} of patterns) {
      const match = regex.exec(remaining);
      if (match && (earliest === null || match.index < earliest.index)) {
        earliest = {
          index: match.index,
          length: match[0].length,
          segment: build(match),
        };
      }
    }

    if (!earliest) {
      segments.push({text: remaining});
      break;
    }

    if (earliest.index > 0) {
      segments.push({text: remaining.slice(0, earliest.index)});
    }
    segments.push(earliest.segment);
    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return segments;
};

const InlineRenderer: React.FC<{text: string; baseColor: string}> = ({
  text,
  baseColor,
}) => {
  const segments = parseInline(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.code) {
          return (
            <Text key={i} style={styles.inlineCode}>
              {seg.text}
            </Text>
          );
        }
        const style: TextStyle = {color: baseColor};
        if (seg.bold) {
          style.fontWeight = '700';
        }
        if (seg.italic) {
          style.fontStyle = 'italic';
        }
        if (seg.link) {
          style.color = '#2563EB';
          style.textDecorationLine = 'underline';
          return (
            <Text
              key={i}
              style={style}
              onPress={() => seg.link && Linking.openURL(seg.link)}>
              {seg.text}
            </Text>
          );
        }
        return (
          <Text key={i} style={style}>
            {seg.text}
          </Text>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------
const isTableSeparator = (s: string): boolean =>
  /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(s) && s.includes('-');

const parseTableRow = (row: string): string[] =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());

// ---------------------------------------------------------------------------
// Block-level rendering
// ---------------------------------------------------------------------------
const MarkdownText: React.FC<MarkdownTextProps> = ({content, color = '#1F2937'}) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    const fenceMatch = line.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <View key={key++} style={styles.codeBlock}>
          {fenceMatch[1] ? (
            <Text style={styles.codeLang}>{fenceMatch[1]}</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.codeBlockText}>{codeLines.join('\n')}</Text>
          </ScrollView>
        </View>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      blocks.push(<View key={key++} style={styles.hr} />);
      i++;
      continue;
    }

    // Table (GitHub-flavoured markdown)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const header = parseTableRow(line);
      i += 2; // skip header + separator row
      const rows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].includes('|') &&
        lines[i].trim() !== '' &&
        !isTableSeparator(lines[i])
      ) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }

      const columnCount = Math.max(
        header.length,
        ...rows.map(r => r.length),
        1,
      );

      blocks.push(
        <View key={key++} style={styles.table}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Header */}
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                {Array.from({length: columnCount}).map((_, ci) => (
                  <View key={ci} style={styles.tableCell}>
                    <Text style={styles.tableHeaderText}>
                      <InlineRenderer
                        text={header[ci] ?? ''}
                        baseColor={'#FFFFFF'}
                      />
                    </Text>
                  </View>
                ))}
              </View>
              {/* Body */}
              {rows.map((row, ri) => (
                <View
                  key={ri}
                  style={[
                    styles.tableRow,
                    ri % 2 === 1 ? styles.tableRowAlt : null,
                    ri === rows.length - 1 ? styles.tableRowLast : null,
                  ]}>
                  {Array.from({length: columnCount}).map((_, ci) => (
                    <View key={ci} style={styles.tableCell}>
                      <Text style={styles.tableCellText}>
                        <InlineRenderer
                          text={row[ci] ?? ''}
                          baseColor={color}
                        />
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>,
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingStyle =
        level === 1
          ? styles.h1
          : level === 2
          ? styles.h2
          : level === 3
          ? styles.h3
          : styles.h4;
      blocks.push(
        <Text key={key++} style={[headingStyle, {color}]}>
          <InlineRenderer text={headingMatch[2]} baseColor={color} />
        </Text>,
      );
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <View key={key++} style={styles.blockquote}>
          <Text style={[styles.paragraph, {color: '#475569'}]}>
            <InlineRenderer text={quoteLines.join(' ')} baseColor={'#475569'} />
          </Text>
        </View>,
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push(
        <View key={key++} style={styles.list}>
          {items.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={[styles.bullet, {color}]}>{'\u2022'}</Text>
              <Text style={[styles.listItemText, {color}]}>
                <InlineRenderer text={item} baseColor={color} />
              </Text>
            </View>
          ))}
        </View>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <View key={key++} style={styles.list}>
          {items.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={[styles.bulletNumber, {color}]}>{idx + 1}.</Text>
              <Text style={[styles.listItemText, {color}]}>
                <InlineRenderer text={item} baseColor={color} />
              </Text>
            </View>
          ))}
        </View>,
      );
      continue;
    }

    // Paragraph (merge consecutive plain lines)
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(\s*[-*_]){3,}\s*$/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <Text key={key++} style={[styles.paragraph, {color}]}>
        <InlineRenderer text={paragraphLines.join(' ')} baseColor={color} />
      </Text>,
    );
  }

  return <View>{blocks}</View>;
};

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  h1: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8,
  },
  h2: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 6,
  },
  h3: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 6,
  },
  h4: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: '#EEF0F4',
    color: '#B5179E',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  codeLang: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  codeBlockText: {
    color: '#E2E8F0',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 19,
  },
  list: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
  },
  bulletNumber: {
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
    fontWeight: '600',
    minWidth: 18,
  },
  listItemText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
    paddingLeft: 12,
    marginBottom: 8,
  },
  hr: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  table: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableHeaderRow: {
    backgroundColor: '#10284C',
    borderBottomWidth: 0,
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    width: 130,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EAEEF3',
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  tableCellText: {
    fontSize: 14,
    lineHeight: 19,
  },
});

export default MarkdownText;
