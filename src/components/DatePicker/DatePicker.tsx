import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import DatePickerStyle from './DatePickerStyle';

interface Props {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD — dates before this are disabled
  maxDate?: string; // YYYY-MM-DD
  error?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseYMD = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDisplay = (ymd: string): string => {
  if (!ymd) return 'Select date';
  const d = parseYMD(ymd);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const DatePicker = ({ label, value, onChange, minDate, maxDate, error }: Props) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const today = toYMD(new Date());
  const effectiveMin = minDate ?? today;

  // Which month/year is the calendar showing
  const initialDate = value ? parseYMD(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const goToPrevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }, [viewMonth]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const isDisabled = useCallback((day: number) => {
    const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (ymd < effectiveMin) return true;
    if (maxDate && ymd > maxDate) return true;
    return false;
  }, [viewYear, viewMonth, effectiveMin, maxDate]);

  const isSelected = useCallback((day: number) => {
    const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return ymd === value;
  }, [viewYear, viewMonth, value]);

  const isToday = useCallback((day: number) => {
    const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return ymd === today;
  }, [viewYear, viewMonth, today]);

  const handleSelect = useCallback((day: number) => {
    const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isDisabled(day)) return;
    onChange(ymd);
    setOpen(false);
  }, [viewYear, viewMonth, isDisabled, onChange]);

  // Prevent going back past current month if minDate is today
  const canGoPrev = useMemo(() => {
    const minD = parseYMD(effectiveMin);
    return !(viewYear === minD.getFullYear() && viewMonth <= minD.getMonth());
  }, [viewYear, viewMonth, effectiveMin]);

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        style={[
          DatePickerStyle.trigger,
          {
            backgroundColor: colors.inputBg,
            borderColor: error ? colors.danger : colors.inputBorder,
          },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="event" size={18} color={colors.textMuted} />
        <View style={DatePickerStyle.triggerContent}>
          <Text style={[DatePickerStyle.triggerLabel, { color: colors.textMuted }]}>{label}</Text>
          <Text style={[DatePickerStyle.triggerValue, { color: value ? colors.text : colors.placeholder }]}>
            {formatDisplay(value)}
          </Text>
        </View>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      {error ? (
        <Text style={[DatePickerStyle.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      {/* Modal Calendar */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={[DatePickerStyle.backdrop, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[DatePickerStyle.calendar, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
            onPress={() => {}}
          >
            {/* Header */}
            <View style={DatePickerStyle.calHeader}>
              <TouchableOpacity
                style={[DatePickerStyle.navBtn, { backgroundColor: canGoPrev ? colors.cardAlt : colors.borderLight }]}
                onPress={canGoPrev ? goToPrevMonth : undefined}
                disabled={!canGoPrev}
              >
                <MaterialIcons name="chevron-left" size={20} color={canGoPrev ? colors.text : colors.textMuted} />
              </TouchableOpacity>

              <View style={DatePickerStyle.monthYearWrapper}>
                <Text style={[DatePickerStyle.monthText, { color: colors.text }]}>
                  {MONTHS[viewMonth]}
                </Text>
                <Text style={[DatePickerStyle.yearText, { color: colors.primary }]}>
                  {viewYear}
                </Text>
              </View>

              <TouchableOpacity
                style={[DatePickerStyle.navBtn, { backgroundColor: colors.cardAlt }]}
                onPress={goToNextMonth}
              >
                <MaterialIcons name="chevron-right" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Day labels */}
            <View style={DatePickerStyle.dayLabels}>
              {DAYS.map((d) => (
                <Text key={d} style={[DatePickerStyle.dayLabel, { color: colors.textMuted }]}>{d}</Text>
              ))}
            </View>

            {/* Grid */}
            <View style={DatePickerStyle.grid}>
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <View key={`empty-${i}`} style={DatePickerStyle.cell} />;
                }
                const disabled = isDisabled(day);
                const selected = isSelected(day);
                const todayFlag = isToday(day);

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      DatePickerStyle.cell,
                      selected && { backgroundColor: colors.primary, borderRadius: 22 },
                      !selected && todayFlag && {
                        borderRadius: 22,
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => handleSelect(day)}
                    disabled={disabled}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        DatePickerStyle.cellText,
                        { color: selected ? '#FFF' : disabled ? colors.borderLight : todayFlag ? colors.primary : colors.text },
                        disabled && { textDecorationLine: 'line-through' },
                        selected && { fontWeight: '800' },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer */}
            <View style={[DatePickerStyle.calFooter, { borderTopColor: colors.border }]}>
              <View style={DatePickerStyle.legendRow}>
                <View style={[DatePickerStyle.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[DatePickerStyle.legendText, { color: colors.textMuted }]}>Selected</Text>
                <View style={[DatePickerStyle.legendDot, { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' }]} />
                <Text style={[DatePickerStyle.legendText, { color: colors.textMuted }]}>Today</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={[DatePickerStyle.cancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default DatePicker;
