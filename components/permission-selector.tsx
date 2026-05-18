import * as React from "react"
import { Check, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Sheet {
  id: string;
  title: string;
  columns: string[];
}

interface PermissionSelectorProps {
  sheets: Sheet[];
  onChange: (permissions: Record<string, string[]>) => void;
  value?: Record<string, string[]>;
  presets?: Array<{ id: string; name: string; permissions: Record<string, string[]> }>;
  onPresetSelect?: (presetId: string) => void;
}

export function PermissionSelector({
  sheets,
  onChange,
  value = {},
  presets = [],
  onPresetSelect
}: PermissionSelectorProps) {
  const [selectedSheet, setSelectedSheet] = React.useState<string>(sheets[0]?.id || "");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPermissions, setCurrentPermissions] = React.useState<Record<string, string[]>>(value);

  // Sync state with prop value
  React.useEffect(() => {
    setCurrentPermissions(value);
  }, [value]);

  const currentSheet = sheets.find(s => s.id === selectedSheet);
  const allColumns = currentSheet?.columns || [];
  const grantedColumns = currentPermissions[selectedSheet] || [];
  const availableColumns = allColumns.filter(col => !grantedColumns.includes(col));

  const filteredAvailable = availableColumns.filter(col => 
    col.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGrant = (column: string) => {
    const nextGranted = [...grantedColumns, column];
    // Keep order of columns as in the sheet
    const sortedGranted = allColumns.filter(c => nextGranted.includes(c));
    const updated = {
      ...currentPermissions,
      [selectedSheet]: sortedGranted
    };
    setCurrentPermissions(updated);
    onChange(updated);
  };

  const handleRevoke = (column: string) => {
    const updated = {
      ...currentPermissions,
      [selectedSheet]: grantedColumns.filter(c => c !== column)
    };
    setCurrentPermissions(updated);
    onChange(updated);
  };

  const handleGrantAll = () => {
    const nextGranted = [...grantedColumns, ...filteredAvailable];
    const sortedGranted = allColumns.filter(c => nextGranted.includes(c));
    const updated = {
      ...currentPermissions,
      [selectedSheet]: sortedGranted
    };
    setCurrentPermissions(updated);
    onChange(updated);
  };

  const handleRevokeAll = () => {
    const updated = {
      ...currentPermissions,
      [selectedSheet]: []
    };
    setCurrentPermissions(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {presets.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Load Preset:</Label>
          <Select onValueChange={onPresetSelect}>
            <SelectTrigger className="h-8 text-xs w-[200px]">
              <SelectValue placeholder="Select a preset" />
            </SelectTrigger>
            <SelectContent>
              {presets.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Label className="text-xs">Select Sheet:</Label>
        <Select value={selectedSheet} onValueChange={setSelectedSheet}>
          <SelectTrigger className="h-8 text-xs w-[200px]">
            <SelectValue placeholder="Select sheet" />
          </SelectTrigger>
          <SelectContent>
            {sheets.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
        {/* Available Columns */}
        <Card className="col-span-3">
          <CardHeader className="p-3">
            <CardTitle className="text-xs font-medium">Available Columns</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-7 h-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-[200px] border rounded-md p-1">
              {filteredAvailable.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center p-2">No columns available</div>
              ) : (
                filteredAvailable.map(col => (
                  <div
                    key={col}
                    className="flex items-center justify-between p-1 hover:bg-accent rounded text-xs cursor-pointer"
                    onClick={() => handleGrant(col)}
                  >
                    <span>{col}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex md:flex-col justify-center gap-2 col-span-1">
          <Button variant="outline" size="icon" onClick={handleGrantAll} title="Grant All Filtered">
            <ChevronsRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRevokeAll} title="Revoke All">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Granted Columns */}
        <Card className="col-span-3">
          <CardHeader className="p-3">
            <CardTitle className="text-xs font-medium flex justify-between items-center">
              Granted Columns
              <Badge variant="secondary" className="text-tiny h-4">
                {grantedColumns.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-[200px] border rounded-md p-1">
              {grantedColumns.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center p-2">No columns granted</div>
              ) : (
                grantedColumns.map(col => (
                  <div
                    key={col}
                    className="flex items-center justify-between p-1 hover:bg-accent rounded text-xs cursor-pointer"
                    onClick={() => handleRevoke(col)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{col}</span>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
