import type {
  CollaborationType,
  ContributorRole,
  DealIssue,
  MasterStructure,
  RecordingStatus,
  RecoupmentTerms,
  RevenueCategory,
  SongStatus,
  SplitLine,
} from '@altar/shared';

export interface SongRecord {
  id: string;
  artist_id: string;
  title: string;
  collaboration_type: CollaborationType | null;
  recording_status: RecordingStatus;
  status: SongStatus;
  expected_release_date: string | null;
  notes: string | null;
  samples_declared: boolean;
  samples_cleared: boolean;
  sample_notes: string | null;
  created_at: string;
}

export interface ContributorRecord {
  id: string;
  legal_name: string;
  stage_name: string | null;
  email: string | null;
  role: ContributorRole;
  pro_affiliation: string | null;
  publisher_name: string | null;
  requires_approval: boolean;
  approval_status: 'pending' | 'accepted' | 'change_requested' | 'declined';
}

export interface SongDeal {
  song: SongRecord;
  contributors: ContributorRecord[];
  masterSplits: SplitLine[];
  compositionSplits: SplitLine[];
  publishingSplits: SplitLine[];
  revenueSplits: { category: RevenueCategory; lines: SplitLine[] }[];
  masterTerms: {
    structure: MasterStructure;
    structure_note: string | null;
    license_term_months: number | null;
  };
  recoupment: {
    terms: RecoupmentTerms;
    acknowledgedAt: string | null;
    plannedExpenses: {
      category: string;
      description: string;
      amountMinor: number;
      recoupable: boolean;
    }[];
  };
  services: string[];
  issues: DealIssue[];
}

export interface SongContext {
  deal: SongDeal;
  reload: () => void;
}

export function displayName(contributor: ContributorRecord): string {
  return contributor.stage_name || contributor.legal_name;
}
