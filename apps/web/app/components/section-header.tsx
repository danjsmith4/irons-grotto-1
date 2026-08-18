import { ReactNode } from 'react';
import styles from './section-header.module.css';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional muted icon (e.g. a @radix-ui/react-icons glyph) — never an emoji. */
  icon?: ReactNode;
  /** Right-aligned controls (search, filters, links). */
  actions?: ReactNode;
}

/**
 * Consistent section heading in the display face. Replaces the old
 * emoji + gradient-text headers across the app.
 */
export function SectionHeader({
  title,
  subtitle,
  icon,
  actions,
}: SectionHeaderProps) {
  return (
    <div className={styles.root}>
      <div className={styles.lead}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
