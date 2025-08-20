"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateRangePicker({
  className,
  onUpdate,
  initialDateFrom,
  initialDateTo
}) {
  const [date, setDate] = React.useState({
    from: initialDateFrom || new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    to: initialDateTo || new Date(),
  })

  // This effect ensures that the parent component is updated whenever the date range changes.
  React.useEffect(() => {
    if (onUpdate) {
      onUpdate({ range: date });
    }
  }, [date, onUpdate]);

  const handleFromDateChange = (e) => {
    const newFromDate = new Date(e.target.value);
    if (!isNaN(newFromDate.getTime())) {
      setDate(prev => ({ ...prev, from: newFromDate }));
    }
  };

  const handleToDateChange = (e) => {
    const newToDate = new Date(e.target.value);
    if (!isNaN(newToDate.getTime())) {
      setDate(prev => ({ ...prev, to: newToDate }));
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[300px] justify-start text-left font-normal bg-slate-700 border-slate-600 hover:bg-slate-600 hover:text-white text-white",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">From Date</label>
              <Input
                type="date"
                value={date.from ? format(date.from, "yyyy-MM-dd") : ""}
                onChange={handleFromDateChange}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">To Date</label>
              <Input
                type="date"
                value={date.to ? format(date.to, "yyyy-MM-dd") : ""}
                onChange={handleToDateChange}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
