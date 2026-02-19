import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Clock, User, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { CashDrawerSession, StaffMember } from '@/types/pos.types';

interface CashDrawerManagerProps {
  open: boolean;
  onClose: () => void;
  currentSession?: CashDrawerSession;
  staff?: StaffMember;
  onSessionStart: (session: CashDrawerSession) => void;
  onSessionEnd: (session: CashDrawerSession) => void;
}

export function CashDrawerManager({
  open,
  onClose,
  currentSession,
  staff,
  onSessionStart,
  onSessionEnd
}: CashDrawerManagerProps) {
  const [openingCash, setOpeningCash] = useState(1000);
  const [openingNotes, setOpeningNotes] = useState('');
  const [actualCash, setActualCash] = useState(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');

  const handleStartSession = () => {
    if (!staff) {
      alert('Please log in as staff first');
      return;
    }

    const newSession: CashDrawerSession = {
      id: `session_${Date.now()}`,
      sellerId: staff.sellerId,
      staffId: staff.id,
      staffName: staff.name,
      sessionNumber: `S${Date.now().toString().slice(-6)}`,
      startTime: new Date().toISOString(),
      status: 'open',
      openingCash,
      expectedCash: openingCash,
      totalSales: 0,
      totalTransactions: 0,
      cashSales: 0,
      cardSales: 0,
      ewalletSales: 0,
      totalRefunds: 0,
      cashIn: 0,
      cashOut: 0,
      openingNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSessionStart(newSession);
    onClose();
  };

  const handleEndSession = () => {
    if (!currentSession) return;

    const difference = actualCash - currentSession.expectedCash;

    const closedSession: CashDrawerSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      status: 'closed',
      actualCash,
      difference,
      closingNotes,
      discrepancyNotes: difference !== 0 ? discrepancyNotes : undefined,
      updatedAt: new Date().toISOString(),
    };

    onSessionEnd(closedSession);
    onClose();
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (start: string) => {
    const duration = Date.now() - new Date(start).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#FF6A00]" />
            Cash Drawer Management
          </DialogTitle>
        </DialogHeader>

        {!currentSession ? (
          /* Start Session Form */
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Starting New Shift
              </h4>
              {staff && (
                <div className="flex items-center gap-2 mt-2">
                  <User className="h-4 w-4 text-blue-700" />
                  <span className="text-sm text-blue-800">
                    Staff: <strong>{staff.name}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Opening Cash Amount (₱)</Label>
              <Input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                min={0}
                step={100}
                className="text-lg font-semibold"
              />
              <p className="text-xs text-gray-500">
                Enter the amount of cash you're starting with in the drawer
              </p>
            </div>

            <div className="space-y-2">
              <Label>Opening Notes (Optional)</Label>
              <Textarea
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Any notes about starting the shift..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleStartSession}
              className="w-full bg-[#FF6A00] hover:bg-[#E65F00]"
              disabled={!staff}
            >
              Start Shift
            </Button>
          </div>
        ) : (
          /* Current Session Info & Close Session Form */
          <div className="space-y-4">
            {/* Session Info Card */}
            <Card className="p-4 bg-gradient-to-br from-[#FF6A00]/10 to-orange-50 border-[#FF6A00]/20">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Session Number</p>
                    <p className="text-lg font-bold text-gray-900">{currentSession.sessionNumber}</p>
                  </div>
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    Active
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Staff</p>
                    <p className="text-sm font-semibold text-gray-900">{currentSession.staffName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Duration</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDuration(currentSession.startTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Started At</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatTime(currentSession.startTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Transactions</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {currentSession.totalTransactions}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Financial Summary */}
            <Card className="p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Financial Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Opening Cash:</span>
                  <span className="font-semibold">₱{currentSession.openingCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cash Sales:</span>
                  <span className="font-semibold text-green-600">
                    +₱{currentSession.cashSales.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Card Sales:</span>
                  <span className="font-semibold text-blue-600">
                    ₱{currentSession.cardSales.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">E-Wallet Sales:</span>
                  <span className="font-semibold text-purple-600">
                    ₱{currentSession.ewalletSales.toLocaleString()}
                  </span>
                </div>
                {currentSession.cashIn > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Cash In:
                    </span>
                    <span className="font-semibold text-green-600">
                      +₱{currentSession.cashIn.toLocaleString()}
                    </span>
                  </div>
                )}
                {currentSession.cashOut > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Cash Out:
                    </span>
                    <span className="font-semibold text-red-600">
                      -₱{currentSession.cashOut.toLocaleString()}
                    </span>
                  </div>
                )}
                {currentSession.totalRefunds > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Refunds:</span>
                    <span className="font-semibold text-red-600">
                      -₱{currentSession.totalRefunds.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Expected Cash:</span>
                    <span className="text-lg font-bold text-[#FF6A00]">
                      ₱{currentSession.expectedCash.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Close Session Form */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-gray-900">Close Shift</h4>

              <div className="space-y-2">
                <Label>Actual Cash Count (₱)</Label>
                <Input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                  className="text-lg font-semibold"
                  placeholder="Count the cash in the drawer"
                />
              </div>

              {actualCash > 0 && (
                <Card className={`p-3 ${
                  actualCash === currentSession.expectedCash
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {actualCash === currentSession.expectedCash ? (
                        <span className="text-green-700 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Perfect! Cash matches expected amount
                        </span>
                      ) : (
                        <span className="text-amber-700">Discrepancy:</span>
                      )}
                    </span>
                    {actualCash !== currentSession.expectedCash && (
                      <span className={`text-lg font-bold ${
                        actualCash > currentSession.expectedCash
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        {actualCash > currentSession.expectedCash ? '+' : ''}
                        ₱{(actualCash - currentSession.expectedCash).toLocaleString()}
                      </span>
                    )}
                  </div>
                </Card>
              )}

              {actualCash > 0 && actualCash !== currentSession.expectedCash && (
                <div className="space-y-2">
                  <Label>Discrepancy Explanation</Label>
                  <Textarea
                    value={discrepancyNotes}
                    onChange={(e) => setDiscrepancyNotes(e.target.value)}
                    placeholder="Explain the cash difference..."
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Closing Notes (Optional)</Label>
                <Textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Any notes about closing the shift..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleEndSession}
                  className="flex-1 bg-[#FF6A00] hover:bg-[#E65F00]"
                  disabled={actualCash === 0}
                >
                  Close Shift
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Compact Cash Drawer Status Badge
export function CashDrawerBadge({ 
  session, 
  onClick 
}: { 
  session?: CashDrawerSession; 
  onClick: () => void;
}) {
  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        className="gap-2 border-gray-300"
      >
        <DollarSign className="h-4 w-4" />
        Start Shift
      </Button>
    );
  }

  return (
    <Card
      className="p-2 cursor-pointer hover:border-[#FF6A00] transition-colors bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-green-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-green-700 font-medium">Session {session.sessionNumber}</p>
          <p className="text-xs text-green-600">₱{session.expectedCash.toLocaleString()}</p>
        </div>
        <div className="text-green-700">
          <Clock className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
