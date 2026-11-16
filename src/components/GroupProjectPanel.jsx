import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import ProjectThumb from './ProjectThumb';
import MemberList from './MemberList';
import ResourceLinks from './ResourceLinks';
import RatingSummary from './RatingSummary';

// Full group + project info. Used by My Group (student) and My Teams (faculty).
export default function GroupProjectPanel({ project, aggregate, detailsTo, showRating = true, onDescriptionSave, onLogoClick }) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(project.description || '');
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState('');

  useEffect(() => {
    setDescriptionDraft(project.description || '');
  }, [project.id, project.description]);

  const saveDescription = async (event) => {
    event.preventDefault();
    if (savingDescription) return;
    setSavingDescription(true);
    setDescriptionError('');
    try {
      await onDescriptionSave(descriptionDraft);
      setEditingDescription(false);
    } catch (error) {
      setDescriptionError(error.message || 'Could not update the group description.');
    } finally {
      setSavingDescription(false);
    }
  };

  return (
    <section className="card overflow-hidden">
      <div className="grid md:grid-cols-[280px_1fr]">
        <ProjectThumb project={project} className="md:h-full md:min-h-[300px] md:aspect-auto" />
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="mb-1 text-xs font-semibold text-primary">{project.group?.groupName || 'Group information unavailable'}</p>
            <h2 className="text-xl font-bold leading-snug sm:text-2xl">{project.title}</h2>
            {editingDescription ? (
              <form className="mt-3 space-y-2" onSubmit={saveDescription}>
                <label className="form-label" htmlFor={`group-description-${project.id}`}>Group description</label>
                <textarea
                  id={`group-description-${project.id}`}
                  rows={4}
                  maxLength={2000}
                  className="form-input resize-y"
                  value={descriptionDraft}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                  disabled={savingDescription}
                />
                {descriptionError && <p role="alert" className="text-sm text-red-600">{descriptionError}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="btn-primary" disabled={savingDescription || descriptionDraft.trim() === (project.description || '').trim()}>
                    {savingDescription ? 'Saving…' : 'Save description'}
                  </button>
                  <button type="button" className="btn-secondary" disabled={savingDescription} onClick={() => { setDescriptionDraft(project.description || ''); setDescriptionError(''); setEditingDescription(false); }}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-2">
                <p className="text-sm leading-relaxed text-muted">{project.description || 'No description provided.'}</p>
                {onDescriptionSave && (
                  <button type="button" className="btn-secondary mt-3" onClick={() => { setDescriptionError(''); setEditingDescription(true); }}>
                    <Pencil className="h-4 w-4" /> Edit description
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-bold">Team members</h3>
            <MemberList members={project.group.members} />
          </div>
          <div className="border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-bold">Project resources</h3>
            <ResourceLinks project={project} onLogoClick={onLogoClick} />
          </div>
          {showRating && <div className="border-t border-line pt-4"><h3 className="mb-2 text-sm font-bold">Rating</h3><RatingSummary aggregate={aggregate} variant="full" /></div>}
          {detailsTo && <Link to={detailsTo} className="btn-primary">View Project Details</Link>}
        </div>
      </div>
    </section>
  );
}
