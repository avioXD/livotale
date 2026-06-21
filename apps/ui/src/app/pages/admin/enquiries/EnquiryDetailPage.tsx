import { useCallback, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { EnquiryCreateOrderPanel } from '@/app/pages/admin/enquiries/EnquiryCreateOrderPanel';
import { EnquiryEditDetailsPanel } from '@/app/pages/admin/enquiries/EnquiryEditDetailsPanel';
import { EnquiryFollowUpNotesPanel } from '@/app/pages/admin/enquiries/EnquiryFollowUpNotesPanel';
import { EnquiryLeadFormPanel } from '@/app/pages/admin/enquiries/EnquiryLeadFormPanel';
import { EnquiryOrderOutcomePanel } from '@/app/pages/admin/enquiries/EnquiryOrderOutcomePanel';
import { EnquiryThreadPanel } from '@/app/pages/admin/enquiries/EnquiryThreadPanel';
import { EnquiryViewPanel } from '@/app/pages/admin/enquiries/EnquiryViewPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnquiryDetailStore } from '@/store/enquiries';
import {
  isActiveCrmThread,
  isArchivedConvertedThread,
  isConvertedLatestThread,
} from '@/utils/enquiryThread';
import { orgPath } from '@/app/config/orgRoutes';

const LIST_PATH = orgPath('/admin/operations?tab=enquiries');
const DETAIL_PATH = orgPath('/admin/enquiries');

export type EnquiryDetailTab =
  | 'view'
  | 'followup'
  | 'create-order'
  | 'edit-details'
  | 'order-outcome'
  | 'edit';

function parseTab(value: string | null, isCreate: boolean): EnquiryDetailTab {
  if (isCreate) return 'edit';
  if (
    value === 'followup' ||
    value === 'create-order' ||
    value === 'edit-details' ||
    value === 'order-outcome'
  ) {
    return value;
  }
  return 'view';
}

export function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCreate = id === 'new';
  const activeTab = parseTab(searchParams.get('tab'), isCreate);

  const enquiry = useEnquiryDetailStore((s) => s.enquiry);
  const threadEnquiries = useEnquiryDetailStore((s) => s.threadEnquiries);
  const packages = useEnquiryDetailStore((s) => s.packages);
  const followUp = useEnquiryDetailStore((s) => s.followUp);
  const orderIntake = useEnquiryDetailStore((s) => s.orderIntake);
  const details = useEnquiryDetailStore((s) => s.details);
  const orderOutcome = useEnquiryDetailStore((s) => s.orderOutcome);
  const isLoading = useEnquiryDetailStore((s) => s.isLoading);
  const isSaving = useEnquiryDetailStore((s) => s.isSaving);
  const isConverting = useEnquiryDetailStore((s) => s.isConverting);
  const error = useEnquiryDetailStore((s) => s.error);
  const loadById = useEnquiryDetailStore((s) => s.loadById);
  const initCreate = useEnquiryDetailStore((s) => s.initCreate);
  const patchFollowUp = useEnquiryDetailStore((s) => s.patchFollowUp);
  const patchOrderIntake = useEnquiryDetailStore((s) => s.patchOrderIntake);
  const patchDetails = useEnquiryDetailStore((s) => s.patchDetails);
  const patchOrderOutcome = useEnquiryDetailStore((s) => s.patchOrderOutcome);
  const createLead = useEnquiryDetailStore((s) => s.createLead);
  const saveFollowUp = useEnquiryDetailStore((s) => s.saveFollowUp);
  const saveDetails = useEnquiryDetailStore((s) => s.saveDetails);
  const saveOrderOutcome = useEnquiryDetailStore((s) => s.saveOrderOutcome);
  const convertToOrder = useEnquiryDetailStore((s) => s.convertToOrder);
  const archiveLead = useEnquiryDetailStore((s) => s.archiveLead);
  const createNewThread = useEnquiryDetailStore((s) => s.createNewThread);
  const isStartingThread = useEnquiryDetailStore((s) => s.isStartingThread);
  const clear = useEnquiryDetailStore((s) => s.clear);

  const archived = enquiry ? isArchivedConvertedThread(enquiry, threadEnquiries) : false;
  const activeCrm = enquiry ? isActiveCrmThread(enquiry, threadEnquiries) : false;
  const convertedLatest = enquiry ? isConvertedLatestThread(enquiry, threadEnquiries) : false;

  const setTab = useCallback(
    (tab: EnquiryDetailTab) => {
      const next = new URLSearchParams(searchParams);
      if (tab === 'view') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      next.delete('section');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (!id) return;
    if (isCreate) {
      void initCreate();
    } else {
      void loadById(id);
    }
    return () => clear();
  }, [id, isCreate, initCreate, loadById, clear]);

  useEffect(() => {
    if (archived && activeTab !== 'view') {
      setTab('view');
    }
    if (convertedLatest && activeTab !== 'view' && activeTab !== 'order-outcome') {
      setTab('view');
    }
    if (activeCrm && activeTab === 'order-outcome') {
      setTab('view');
    }
  }, [archived, convertedLatest, activeCrm, activeTab, setTab]);

  const handleCreate = async (input: Parameters<typeof createLead>[0]) => {
    try {
      const created = await createLead(input);
      navigate(`${DETAIL_PATH}/${created.id}?tab=view`, { replace: true });
    } catch {
      // error in store
    }
  };

  const handleSaveFollowUp = async () => {
    if (!id || isCreate) return;
    try {
      await saveFollowUp(id);
    } catch {
      // error in store
    }
  };

  const handleSaveDetails = async () => {
    if (!id || isCreate) return;
    try {
      await saveDetails(id);
      setTab('view');
    } catch {
      // error in store
    }
  };

  const handleSaveOrderOutcome = async () => {
    if (!id || isCreate) return;
    try {
      await saveOrderOutcome(id);
      setTab('view');
    } catch {
      // error in store
    }
  };

  const handleConvert = async () => {
    if (!id || isCreate) return;
    try {
      const orderId = await convertToOrder(id);
      navigate(orgPath(`/admin/orders/${orderId}`));
    } catch {
      // error in store
    }
  };

  const handleNewThread = async () => {
    if (!id || isCreate) return;
    try {
      const created = await createNewThread(id);
      navigate(`${DETAIL_PATH}/${created.id}?tab=view`, { replace: true });
    } catch {
      // error in store
    }
  };

  const handleArchive = async () => {
    if (!id || isCreate) return;
    if (!globalThis.confirm('Archive this lead? It will be removed from the active enquiries list.')) return;
    try {
      await archiveLead(id);
      navigate(LIST_PATH);
    } catch {
      // error in store
    }
  };

  if (!id) return <Navigate to={LIST_PATH} replace />;

  if (isLoading) {
    return <p className="text-muted-foreground">Loading enquiry…</p>;
  }

  if (!isCreate && !enquiry) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Enquiry not found.</p>
        <Button variant="outline" asChild>
          <Link to={LIST_PATH}>Back to enquiries</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={LIST_PATH} aria-label="Back to enquiries">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={isCreate ? 'Add lead' : `${enquiry!.enquiryNumber} — ${enquiry!.patientName}`}
            description={
              isCreate
                ? 'Manual CRM entry — WhatsApp or phone'
                : `${enquiry!.phone} · Thread #${enquiry!.threadSequence} · ${enquiry!.source}`
            }
          />
        </div>
      </div>

      {!isCreate && enquiry && (
        <EnquiryThreadPanel
          threadEnquiries={threadEnquiries}
          currentEnquiryId={enquiry.id}
          onStartNewThread={
            enquiry.status === 'converted' || enquiry.status === 'closed'
              ? () => void handleNewThread()
              : undefined
          }
          startingThread={isStartingThread}
        />
      )}

      {archived && (
        <p className="text-xs text-muted-foreground">
          Archived converted thread — view only. Use the latest thread for new CRM work.
        </p>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as EnquiryDetailTab)}>
        <TabsList>
          {isCreate ? (
            <TabsTrigger value="edit">Create</TabsTrigger>
          ) : (
            <>
              <TabsTrigger value="view">View</TabsTrigger>
              {activeCrm && (
                <>
                  <TabsTrigger value="followup">Follow-up</TabsTrigger>
                  <TabsTrigger value="create-order">Create order</TabsTrigger>
                  <TabsTrigger value="edit-details">Edit details</TabsTrigger>
                </>
              )}
              {convertedLatest && (
                <TabsTrigger value="order-outcome">Order outcome</TabsTrigger>
              )}
            </>
          )}
        </TabsList>

        {!isCreate && (
          <TabsContent value="view" className="mt-3">
            {enquiry && <EnquiryViewPanel enquiry={enquiry} archived={archived} />}
          </TabsContent>
        )}

        {isCreate ? (
          <TabsContent value="edit" className="mt-3">
            <div className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <EnquiryLeadFormPanel
                packages={packages}
                saving={isSaving}
                onSubmit={(input) => void handleCreate(input)}
                onCancel={() => navigate(LIST_PATH)}
              />
            </div>
          </TabsContent>
        ) : (
          enquiry && (
            <>
              {activeCrm && (
                <>
                  <TabsContent value="followup" className="mt-3">
                    <div className="space-y-4">
                      {error && activeTab === 'followup' && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                      <EnquiryFollowUpNotesPanel
                        enquiry={enquiry}
                        followUp={followUp}
                        onChange={patchFollowUp}
                        onSave={() => void handleSaveFollowUp()}
                        saving={isSaving}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="create-order" className="mt-3">
                    <div className="space-y-4">
                      {error && activeTab === 'create-order' && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                      <EnquiryCreateOrderPanel
                        enquiry={enquiry}
                        packages={packages}
                        followUp={followUp}
                        orderIntake={orderIntake}
                        onChange={patchFollowUp}
                        onIntakeChange={patchOrderIntake}
                        onConvert={() => void handleConvert()}
                        converting={isConverting}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="edit-details" className="mt-3">
                    <div className="space-y-4">
                      {error && activeTab === 'edit-details' && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                      <EnquiryEditDetailsPanel
                        enquiry={enquiry}
                        packages={packages}
                        details={details}
                        onChange={patchDetails}
                        onSave={() => void handleSaveDetails()}
                        saving={isSaving}
                      />
                      {enquiry.status !== 'converted' && (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-destructive"
                          disabled={isSaving}
                          onClick={() => void handleArchive()}
                        >
                          Archive lead
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                </>
              )}

              {convertedLatest && (
                <TabsContent value="order-outcome" className="mt-3">
                  <div className="space-y-4">
                    {error && activeTab === 'order-outcome' && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    <EnquiryOrderOutcomePanel
                      enquiry={enquiry}
                      outcome={orderOutcome}
                      onChange={patchOrderOutcome}
                      onSave={() => void handleSaveOrderOutcome()}
                      saving={isSaving}
                    />
                  </div>
                </TabsContent>
              )}
            </>
          )
        )}
      </Tabs>
    </div>
  );
}
