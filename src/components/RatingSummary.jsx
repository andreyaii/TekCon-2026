import StarRating from './StarRating';
import { useSettings } from '../context/SettingsContext';
import { formatScore } from '../utils/ratings';

export default function RatingSummary({ aggregate }) {
  const { ratingsShown } = useSettings();

  if (!ratingsShown) return null;
  if (!aggregate) return <span className="text-xs text-muted">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <StarRating value={aggregate.average} />
      <span className="text-xs font-bold text-star">{formatScore(aggregate.average)}</span>
      <span className="text-xs text-muted">({aggregate.count})</span>
    </span>
  );
}
