import React, { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../context/ProjectContext';
import {
  EducationLevel,
  STRATEGIES,
  ParsedBulkProjectItem,
  PROJECT_STATUSES,
  ProjectStatus,
} from '../types';
import { Alert } from './Alert';
import { SpinnerOverlay } from './Spinner';
import { parseFlexiblePercentage } from '../utils/percentageHelper';
import {
  parsePastedProjects,
  guessFieldFromHeaderOrSample,
  FIELD_LABELS,
  SupportedField,
  ColumnMappingItem,
  DetectedFormat,
  extractTargetComponents,
  extractResultComponents,
} from '../utils/projectParser';
import {
  X,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  TableProperties,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Trash2,
  Plus,
  RefreshCw,
  Copy,
  ArrowRight,
  User,
  Sliders,
  SlidersHorizontal,
  Wand2,
  Filter,
  Eye,
  Check,
  ChevronDown,
  Info,
  Target,
  Award,
  FileText,
} from 'lucide-react';

interface BulkAddModalProps {
  onClose: () => void;
}

export const BulkAddModal: React.FC<BulkAddModalProps> = ({ onClose }) => {
  const { bulkAddProjects, currentLevel, selectedYear, isAdmin } = useProjectStore();

  // Global batch settings
  const [academicYear, setAcademicYear] = useState<number>(selectedYear || 2568);
  const [level, setLevel] = useState<EducationLevel>(currentLevel || 'basic_education');
  const [strategy, setStrategy] = useState<string>(STRATEGIES[0]);
  const [defaultResponsible, setDefaultResponsible] = useState<string>('');

  // Raw pasted text
  const [rawText, setRawText] = useState<string>('');

  // Interactive parsed items list
  const [parsedItems, setParsedItems] = useState<ParsedBulkProjectItem[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat>('plain_lines');
  const [detectedColumns, setDetectedColumns] = useState<ColumnMappingItem[]>([]);
  const [customColumnMap, setCustomColumnMap] = useState<Record<number, SupportedField>>({});
  const [showColumnMapper, setShowColumnMapper] = useState<boolean>(false);

  // Filter tab in preview grid
  const [gridFilter, setGridFilter] = useState<'all' | 'ready' | 'needs_review'>('all');

  // Detail drawer / modal for editing single row in depth
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tidyNotice, setTidyNotice] = useState<string | null>(null);

  // Auto-parse on text change or column map change
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedItems([]);
      setDetectedFormat('plain_lines');
      setDetectedColumns([]);
      return;
    }

    const result = parsePastedProjects(
      rawText,
      {
        academicYear,
        level,
        strategy,
        defaultResponsible: defaultResponsible.trim() || undefined,
      },
      Object.keys(customColumnMap).length > 0 ? customColumnMap : undefined
    );

    setParsedItems(result.validProjects);
    setDetectedFormat(result.formatDetected);
    if (result.detectedColumns) {
      setDetectedColumns(result.detectedColumns);
    }
  }, [rawText, academicYear, level, strategy, defaultResponsible, customColumnMap]);

  // Handle single item field update in preview table
  const handleUpdateItem = (index: number, field: keyof ParsedBulkProjectItem, value: any) => {
    setParsedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Handle column map modification for table paste
  const handleColumnMapChange = (colIndex: number, newField: SupportedField) => {
    setCustomColumnMap((prev) => ({
      ...prev,
      [colIndex]: newField,
    }));
  };

  // Reset column mapping to automatic guess
  const handleResetColumnMap = () => {
    setCustomColumnMap({});
  };

  // Handle row deletion
  const handleDeleteRow = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Duplicate row
  const handleDuplicateRow = (index: number) => {
    setParsedItems((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const copy = [...prev];
      copy.splice(index + 1, 0, {
        ...target,
        id: `dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: `${target.name} (สำเนา)`,
      });
      return copy;
    });
  };

  // Add manual row
  const handleAddBlankRow = () => {
    const newItem: ParsedBulkProjectItem = {
      id: `manual-${Date.now()}`,
      name: '',
      responsiblePerson: defaultResponsible.trim() || 'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน',
      strategy,
      level,
      academicYear,
      targetQuantityPercent: 100,
      targetQualityDesc: 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด',
      resultQuantityPercent: 0,
      resultQualityDesc: 'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน',
      status: '6. ยังไม่ดำเนินการ',
      budget: 0,
    };
    setParsedItems((prev) => [newItem, ...prev]);
  };

  // Apply default responsible to all parsed items
  const handleApplyResponsibleToAll = () => {
    if (!defaultResponsible.trim()) return;
    setParsedItems((prev) =>
      prev.map((item) => ({ ...item, responsiblePerson: defaultResponsible.trim() }))
    );
    showNotice(`กำหนดผู้รับผิดชอบ "${defaultResponsible.trim()}" ให้ทุกโครงการเรียบร้อยแล้ว`);
  };

  // Fill default 100% target quantity for all empty rows
  const handleFillDefaultQuantityTargets = () => {
    setParsedItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetQuantityPercent: item.targetQuantityPercent ?? 100,
      }))
    );
    showNotice('เติมเป้าหมายเชิงปริมาณ 100% เรียบร้อยแล้ว');
  };

  // Fill standard quality description for rows with empty description
  const handleFillStandardQualityDesc = () => {
    const defaultDesc = 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด';
    setParsedItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetQualityDesc:
          item.targetQualityDesc && item.targetQualityDesc.trim().length > 3
            ? item.targetQualityDesc
            : defaultDesc,
      }))
    );
    showNotice('เติมเป้าหมายเชิงคุณภาพมาตรฐานสำหรับโครงการที่ยังว่างเรียบร้อยแล้ว');
  };

  // Re-run deep target extraction across all items
  const handleDeepExtractTargets = () => {
    let updatedCount = 0;
    setParsedItems((prev) =>
      prev.map((item) => {
        // Deep extract from combined name and existing target texts
        const rawCombine = `${item.name} ${item.targetQualityDesc || ''}`;
        const extracted = extractTargetComponents(rawCombine);

        let newQty = item.targetQuantityPercent;
        let newQual = item.targetQualityDesc;

        if (extracted.quantityPercent !== undefined && extracted.hasExplicitQuantity) {
          newQty = extracted.quantityPercent;
          updatedCount++;
        }
        if (extracted.qualityDesc && extracted.hasExplicitQuality) {
          newQual = extracted.qualityDesc;
          updatedCount++;
        }

        return {
          ...item,
          targetQuantityPercent: newQty ?? 100,
          targetQualityDesc: newQual || 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด',
        };
      })
    );
    showNotice(`ตรวจจับและสกัดเป้าหมายเชิงปริมาณและเชิงคุณภาพอัตโนมัติสำเร็จ (${updatedCount} จุด)`);
  };

  // Clean and Tidy data automatically (Normalizes names, removes quotes & stray symbols)
  const handleAutoCleanAndTidy = () => {
    setParsedItems((prev) =>
      prev.map((item) => {
        let cleanName = (item.name || '').trim();
        cleanName = cleanName.replace(/^(?:(?:ลำดับที่?|โครงการที่?|ข้อที่?)\s*)?\d+(?:\.\d+)*[\.\)\:\-\s]\s*/i, '');
        cleanName = cleanName.replace(/^["'“”‘’](.*)["'“”‘’]$/, '$1').trim();
        cleanName = cleanName.replace(/^[\-\•\*\–\—\s]+/, '');

        let cleanQuality = (item.targetQualityDesc || '').trim();
        cleanQuality = cleanQuality.replace(/^["'“”‘’](.*)["'“”‘’]$/, '$1').trim();

        return {
          ...item,
          name: cleanName,
          targetQualityDesc: cleanQuality || 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด',
          responsiblePerson:
            item.responsiblePerson?.trim() ||
            defaultResponsible.trim() ||
            'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน',
          targetQuantityPercent: item.targetQuantityPercent ?? 100,
          budget: item.budget || 0,
        };
      })
    );
    showNotice('จัดระเบียบข้อมูล ตัดตัวเลขนำหน้า และทำความสะอาดรายละเอียดโครงการสำเร็จ');
  };

  const showNotice = (msg: string) => {
    setTidyNotice(msg);
    setTimeout(() => setTidyNotice(null), 3500);
  };

  // Preset templates for testing
  const loadTemplate = (type: 'tsv' | 'blocks' | 'list') => {
    if (type === 'tsv') {
      const sample = [
        'ลำดับ\tชื่อโครงการ\tผู้รับผิดชอบ\tยุทธศาสตร์\tงบประมาณ\tเป้าหมายเชิงปริมาณ\tเป้าหมายเชิงคุณภาพ\tสถานะ',
        '1\tโครงการพัฒนาทักษะภาษาอังกฤษเพื่อการสื่อสารสากล (CMC Global English)\tครูจอห์น สมิธ\tยุทธศาสตร์ ที่ 2 พัฒนาผลสัมฤทธิ์ทางการศึกษาตามหลักสูตรสถานศึกษา\t40000\tร้อยละ 85\tนักเรียนชั้นมัธยมศึกษาตอนต้นมีทักษะการสื่อสารภาษาอังกฤษในระดับดีขึ้นไปตามเกณฑ์ CEFR\t5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)',
        '2\tโครงการค่ายคุณธรรมและจริยธรรมคริสเตียน\tครูสมชาย คำแปง\tยุทธศาสตร์ ที่ 1 พัฒนาคุณภาพเด็กบนพื้นฐานของคริสตจริยธรรม\t25000\tร้อยละ 100\tนักเรียนทุกคนมีจิตอาสาและประพฤติตนตามหลักคำสอนคริสตจริยธรรมอย่างสม่ำเสมอ\t5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)',
        '3\tโครงการยกระดับผลสัมฤทธิ์คณิตศาสตร์และสะเต็มศึกษา (STEM Activity)\tครูวิไลลักษณ์ ใจดี\tยุทธศาสตร์ ที่ 2 พัฒนาผลสัมฤทธิ์ทางการศึกษาตามหลักสูตรสถานศึกษา\t30000\tร้อยละ 90\tนักเรียนมีผลการประเมินทักษะการคิดวิเคราะห์และแก้ปัญหาผ่านเกณฑ์ไม่น้อยกว่าร้อยละ 80\t5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)',
        '4\tโครงการอบรมพัฒนาศักยภาพครูยุคดิจิทัลและปัญญาประดิษฐ์ (AI in Classroom)\tฝ่ายวิชาการ\tยุทธศาสตร์ ที่ 3 พัฒนาและเพิ่มขีดความสามารถของครูและบุคลากร\t15000\tร้อยละ 100\tครูผู้สอนทุกคนสามารถสร้างสื่อนวัตกรรมและนำเทคโนโลยี AI มาประยุกต์ใช้ในการจัดกิจกรรมการเรียนรู้\t1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว',
        '5\tโครงการปรับปรุงภูมิทัศน์และสิ่งแวดล้อมเพื่อการเรียนรู้สีเขียว\tฝ่ายบริการและอาคารสถานที่\tยุทธศาสตร์ ที่ 4 เพิ่มประสิทธิภาพการบริหารจัดการที่เอื้อต่อคุณภาพการจัดการศึกษาและการเรียนรู้\t50000\tร้อยละ 100\tสถานศึกษาได้รับรางวัลพื้นที่เรียนรู้ปลอดภัย สะอาด ร่มรื่น และเป็นมิตรกับสิ่งแวดล้อม\t5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)',
      ].join('\n');
      setRawText(sample);
      setCustomColumnMap({});
    } else if (type === 'blocks') {
      const sample = [
        'ชื่อโครงการ: โครงการค่ายส่งเสริมทักษะวิทยาศาสตร์สิ่งแวดล้อมและดาราศาสตร์',
        'ผู้รับผิดชอบ: ครูศิริพร บุญยืน',
        'ยุทธศาสตร์: ยุทธศาสตร์ที่ 2',
        'งบประมาณ: 20000',
        'เป้าหมายเชิงปริมาณ: ร้อยละ 90 ของนักเรียนระดับชั้น ม.1-3',
        'เป้าหมายเชิงคุณภาพ: นักเรียนมีความรู้ความเข้าใจดาราศาสตร์และมีทักษะกระบวนการทางวิทยาศาสตร์',
        'ผลการดำเนินงานเชิงปริมาณ: ร้อยละ 95',
        'ผลการดำเนินงานเชิงคุณภาพ: นักเรียนเข้าร่วมครบถ้วนและประเมินความพึงพอใจในระดับดีเยี่ยม',
        'สถานะ: 1. ดำเนินการเสร็จสิ้น ส่งเล่มโครงการเรียบร้อยแล้ว',
        '',
        'ชื่อโครงการ: โครงการนมัสการพระเจ้าและวันคริสต์มาสประจำปี',
        'ผู้รับผิดชอบ: ฝ่ายศาสนกิจ (ครูอานนท์)',
        'ยุทธศาสตร์: ยุทธศาสตร์ที่ 1',
        'งบประมาณ: 35000',
        'เป้าหมายเชิงปริมาณ: ร้อยละ 100 ของครู นักเรียน และบุคลากร',
        'เป้าหมายเชิงคุณภาพ: เสริมสร้างความรัก ความสามัคคี และจิตวิญญาณแห่งความเอื้ออาทรตามแบบอย่างพระคริสต์',
        'สถานะ: 5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)',
        '',
        'ชื่อโครงการ: โครงการพัฒนาระบบเครือข่ายสารสนเทศและความปลอดภัยทางไซเบอร์',
        'ผู้รับผิดชอบ: ครูสิทธิชัย ไอที',
        'ยุทธศาสตร์: ยุทธศาสตร์ที่ 4',
        'งบประมาณ: 45000',
        'เป้าหมายเชิงปริมาณ: ร้อยละ 100 ของห้องเรียนและสำนักงาน',
        'เป้าหมายเชิงคุณภาพ: ระบบเครือข่ายอินเทอร์เน็ตมีความเสถียร ปลอดภัย และรองรับการจัดการเรียนการสอนแบบผสมผสาน',
        'สถานะ: 5. อยู่ระหว่างดำเนินการ (ตลอดปีการศึกษา)',
      ].join('\n');
      setRawText(sample);
      setCustomColumnMap({});
    } else {
      const sample = [
        '1. โครงการส่งเสริมสุขภาวะและการออกกำลังกาย (ครูธนากร สุขใจ) [ยุทธศาสตร์ที่ 1] งบ 12,000 บาท เป้าหมายเชิงปริมาณ: ร้อยละ 90 เป้าหมายเชิงคุณภาพ: นักเรียนมีสุขภาพกายและดัชนีมวลกายตามเกณฑ์มาตรฐานสุขศึกษา',
        '2. โครงการดนตรีและศิลปะสร้างสรรค์เยาวชน (ครูอานนท์ ดนตรีไทย) [ยุทธศาสตร์ที่ 1] งบ 18,000 บาท เป้าหมาย: ร้อยละ 85 นักเรียนสามารถบรรเลงเครื่องดนตรีได้อย่างน้อย 1 ชนิด',
        '3. โครงการพัฒนาห้องปฏิบัติการคอมพิวเตอร์และสื่อดิจิทัล (ครูสิทธิชัย) [ยุทธศาสตร์ที่ 4] งบ 30,000 บาท เป้าหมายเชิงปริมาณ: ร้อยละ 95 เป้าหมายเชิงคุณภาพ: นักเรียนทุกคนมีอุปกรณ์คอมพิวเตอร์ต่อคนต่อชั่วโมงเรียน',
        '4. โครงการศึกษาดูงานแลกเปลี่ยนเรียนรู้วิชาชีพครู (ฝ่ายบุคลากร) [ยุทธศาสตร์ที่ 3] งบ 25,000 บาท เป้าหมาย: ร้อยละ 100 ครูทุกคนนำความรู้มาพัฒนางานวิจัยในชั้นเรียน',
      ].join('\n');
      setRawText(sample);
      setCustomColumnMap({});
    }
  };

  // Submit parsed items to store
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessCount(null);

    if (!isAdmin) {
      setErrorMsg('คุณต้องเข้าสู่ระบบแอดมินก่อนเพิ่มข้อมูล');
      return;
    }

    if (parsedItems.length === 0) {
      setErrorMsg('ไม่พบข้อมูลโครงการที่พร้อมนำเข้า กรุณาวางข้อความหรือพิมพ์โครงการ');
      return;
    }

    // Check for empty names
    const invalidItems = parsedItems.filter((p) => !p.name || p.name.trim().length < 2);
    if (invalidItems.length > 0) {
      setErrorMsg(`มีจำนวน ${invalidItems.length} โครงการที่ยังไม่ได้ระบุชื่อโครงการ กรุณาตรวจสอบหรือลบแถวที่ไม่สมบูรณ์ออก`);
      setGridFilter('needs_review');
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitizedProjects = parsedItems.map((p) => ({
        ...p,
        targetQuantityPercent: parseFlexiblePercentage(p.targetQuantityPercent, 100),
        resultQuantityPercent: parseFlexiblePercentage(p.resultQuantityPercent, 0),
      }));

      const res = await bulkAddProjects({
        academicYear,
        level,
        strategy,
        parsedProjects: sanitizedProjects,
      });

      if (res.success) {
        setSuccessCount(res.count);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.message || 'ไม่สามารถเพิ่มโครงการได้');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการนำเข้าโครงการ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for review & quality counters
  const totalCount = parsedItems.length;
  const invalidCount = parsedItems.filter((p) => !p.name || p.name.trim().length < 2).length;
  const readyCount = totalCount - invalidCount;
  const totalBudget = useMemo(() => {
    return parsedItems.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  }, [parsedItems]);

  const uniqueTeachersCount = useMemo(() => {
    const set = new Set<string>();
    parsedItems.forEach((p) => {
      if (p.responsiblePerson && p.responsiblePerson !== 'ผู้รับผิดชอบโครงการตามคำสั่งโรงเรียน') {
        set.add(p.responsiblePerson);
      }
    });
    return set.size;
  }, [parsedItems]);

  // Live Extraction Metrics
  const liveStats = useMemo(() => {
    const defaultQual = 'ดำเนินโครงการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด';
    const defaultRes = 'อยู่ระหว่างเตรียมการหรือดำเนินการตามปฏิทินปฏิบัติงาน';

    const withQuantity = parsedItems.filter((p) => (p.targetQuantityPercent ?? 0) > 0).length;
    const withQuality = parsedItems.filter(
      (p) => p.targetQualityDesc && p.targetQualityDesc.trim().length > 3 && p.targetQualityDesc.trim() !== defaultQual
    ).length;
    const withResultQty = parsedItems.filter((p) => (p.resultQuantityPercent ?? 0) > 0).length;
    const withResultQual = parsedItems.filter(
      (p) => p.resultQualityDesc && p.resultQualityDesc.trim().length > 3 && p.resultQualityDesc.trim() !== defaultRes
    ).length;

    return {
      withQuantity,
      withQuality,
      withResultQty,
      withResultQual,
      hasFullTargets: withQuantity === parsedItems.length && withQuality > 0 && parsedItems.length > 0,
    };
  }, [parsedItems]);

  // Displayed items in grid according to filter
  const displayedGridItems = useMemo(() => {
    if (gridFilter === 'ready') {
      return parsedItems.filter((p) => p.name && p.name.trim().length >= 2);
    }
    if (gridFilter === 'needs_review') {
      return parsedItems.filter((p) => !p.name || p.name.trim().length < 2);
    }
    return parsedItems;
  }, [parsedItems, gridFilter]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-6xl flex flex-col shadow-saas border border-slate-200/90 overflow-hidden my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern SaaS Bento Header */}
        <div className="p-5 sm:p-6 bg-slate-50/90 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  นำเข้าโครงการทีละหลายรายการ (Smart Bulk Import)
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ระบบคัดแยกและจัดเรียงข้อมูลอัตโนมัติ
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ตรวจจับเป้าหมายทั้งปริมาณ & คุณภาพ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                คัดลอกตารางจาก Excel / Google Sheets หรือข้อความหลายโครงการมาวาง ระบบจะแยกชื่อโครงการ ผู้รับผิดชอบ งบประมาณ <strong>จำนวนร้อยละของเป้าหมาย (เชิงปริมาณ)</strong> และ <strong>เป้าหมายเชิงคุณภาพ</strong> ให้อัตโนมัติ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center transition shrink-0 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Bento Grid Layout */}
        <form onSubmit={handleSubmit} className="relative flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50">
          {/* Loading spinner with blurred faint backdrop */}
          <SpinnerOverlay
            isLoading={isSubmitting}
            type="dotted-round"
            size="xxl"
            message="กำลังนำเข้าข้อมูลโครงการสู่ระบบและ Google Sheets..."
            subMessage="ระบบกำลังตรวจสอบและบันทึกข้อมูลอย่างปลอดภัย กรุณารอสักครู่"
          />

          {/* Feedback messages with semantic Alert */}
          {errorMsg && (
            <Alert
              variant="error"
              title="เกิดข้อผิดพลาดในการนำเข้าข้อมูล"
              onClose={() => setErrorMsg(null)}
            >
              {errorMsg}
            </Alert>
          )}

          {successCount !== null && (
            <Alert
              variant="success"
              title="นำเข้าข้อมูลสำเร็จ"
            >
              นำเข้าข้อมูลสำเร็จ {successCount} โครงการ สู่ระบบและ Google Sheets เรียบร้อยแล้ว!
            </Alert>
          )}

          {tidyNotice && (
            <Alert
              variant="info"
              onClose={() => setTidyNotice(null)}
            >
              {tidyNotice}
            </Alert>
          )}

          {/* Bento Tier 1: Global Batch Settings (Year and Level) */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-saas grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ปีการศึกษา (พ.ศ.) <span className="text-rose-500">*</span>
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white cursor-pointer"
                required
              >
                {[2572, 2571, 2570, 2569, 2568, 2567, 2566].map((yr) => (
                  <option key={yr} value={yr}>
                    ปีการศึกษา {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ระดับการศึกษาเริ่มต้น <span className="text-rose-500">*</span>
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as EducationLevel)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white cursor-pointer"
              >
                <option value="early_childhood">ระดับการศึกษาปฐมวัย</option>
                <option value="basic_education">ระดับการศึกษาขั้นพื้นฐาน</option>
              </select>
            </div>
          </div>

          {/* Bento Tier 2: Raw Paste Input Area & Detection */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-saas space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <label className="text-xs sm:text-sm font-bold text-slate-900">
                  ช่องวางข้อมูลโครงการ (Raw Input Studio)
                </label>
                {parsedItems.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ตรวจพบ {parsedItems.length} โครงการ
                  </span>
                )}
              </div>

              {/* Sample Templates & Reset Tools */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-semibold">ตัวอย่างข้อมูล:</span>
                <button
                  type="button"
                  onClick={() => loadTemplate('tsv')}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
                  title="ทดสอบตารางที่มีคอลัมน์เป้าหมายเชิงปริมาณและเป้าหมายเชิงคุณภาพ"
                >
                  ตาราง Excel (ปริมาณ+คุณภาพ)
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate('blocks')}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
                >
                  บล็อกข้อความ (Key-Value)
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate('list')}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
                >
                  รายชื่อแบบมีวงเล็บ
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawText('');
                      setCustomColumnMap({});
                    }}
                    className="text-xs px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 font-semibold transition cursor-pointer ml-1"
                  >
                    ล้างข้อความ
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`คัดลอกข้อมูลโครงการจาก Excel, Google Sheets, Word หรือบันทึกข้อความมาวางที่นี่ได้ทันที...\n\nระบบจะคัดแยก: ชื่อโครงการ, ผู้รับผิดชอบ, ยุทธศาสตร์, งบประมาณ, เป้าหมายเชิงปริมาณ (ร้อยละ %), เป้าหมายเชิงคุณภาพ, ผลการดำเนินงาน, และสถานะ ให้อัตโนมัติ`}
                className="w-full px-3.5 py-3 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-xs sm:text-sm font-mono placeholder:text-slate-400 leading-relaxed bg-slate-50/50"
              />
            </div>

            {/* Format Detection, Extraction Metrics & Interactive Column Mapper Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700">รูปแบบที่ตรวจพบ:</span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                  {detectedFormat === 'tsv_excel'
                    ? 'ตาราง Excel / Google Sheets (TSV Columns)'
                    : detectedFormat === 'csv'
                    ? 'ไฟล์ CSV (Comma Separated)'
                    : detectedFormat === 'key_value_blocks'
                    ? 'หัวข้อแยกบรรทัด (Key-Value Paragraphs)'
                    : detectedFormat === 'pipe_delimited'
                    ? 'คั่นด้วยขีดตรง (Pipe Delimited)'
                    : 'รายชื่อโครงการแบบแยกบรรทัด'}
                </span>

                {detectedColumns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowColumnMapper(!showColumnMapper)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>
                      {showColumnMapper ? 'ซ่อนตัวปรับแต่งคอลัมน์' : `ปรับแต่งการจับคู่คอลัมน์ (${detectedColumns.length} คอลัมน์)`}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showColumnMapper ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Extraction KPI Metrics */}
              <div className="flex items-center gap-2 flex-wrap text-slate-500 font-medium">
                {parsedItems.length > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      <Target className="w-3 h-3" />
                      <span>เป้าหมายเชิงปริมาณ {liveStats.withQuantity} รายการ</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      <Award className="w-3 h-3" />
                      <span>เป้าหมายเชิงคุณภาพ {liveStats.withQuality} รายการ</span>
                    </span>
                  </>
                )}
                {uniqueTeachersCount > 0 && (
                  <span>ครูผู้รับผิดชอบ {uniqueTeachersCount} คน</span>
                )}
                {totalBudget > 0 && (
                  <span>· งบรวม {totalBudget.toLocaleString('th-TH')} บาท</span>
                )}
              </div>
            </div>

            {/* Interactive Column Mapping Studio (Accordion Drawer) */}
            {showColumnMapper && detectedColumns.length > 0 && (
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span>จับคู่คอลัมน์ตาราง Excel/Google Sheets (Column Mapping Studio)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetColumnMap}
                    className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    ตรวจจับอัตโนมัติใหม่ (Auto-Detect)
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  ตรวจสอบและกำหนดว่าแต่ละคอลัมน์ในตารางที่คัดลอกมาตรงกับข้อมูลช่องใดในระบบ รองรับทั้งคอลัมน์เป้าหมายเชิงปริมาณและเชิงคุณภาพ
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {detectedColumns.map((col) => (
                    <div
                      key={col.colIndex}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>คอลัมน์ {col.colIndex + 1}: {col.headerText || 'ไม่มีหัวข้อ'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">#{col.colIndex + 1}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate bg-slate-50 px-2 py-1 rounded border border-slate-100" title={col.sampleValue}>
                        ตัวอย่าง: {col.sampleValue || '(ว่าง)'}
                      </div>
                      <div>
                        <select
                          value={customColumnMap[col.colIndex] !== undefined ? customColumnMap[col.colIndex] : col.detectedField}
                          onChange={(e) => handleColumnMapChange(col.colIndex, e.target.value as SupportedField)}
                          className="w-full text-xs font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-200 rounded-md p-1.5 focus:outline-hidden cursor-pointer"
                        >
                          {Object.entries(FIELD_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bento Tier 3: Interactive Data Studio & Grid Editor */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-saas overflow-hidden">
            {/* Toolbar Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <TableProperties className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  ตารางตรวจสอบและจัดเรียงข้อมูล ({parsedItems.length} รายการ)
                </h3>

                {/* Filter segments */}
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs ml-2">
                  <button
                    type="button"
                    onClick={() => setGridFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      gridFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridFilter('ready')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      gridFilter === 'ready' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    พร้อมนำเข้า ({readyCount})
                  </button>
                  {invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setGridFilter('needs_review')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                        gridFilter === 'needs_review' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      ต้องตรวจสอบ ({invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Batch Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDeepExtractTargets}
                  disabled={parsedItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer disabled:opacity-50"
                  title="สกัดและวิเคราะห์เป้าหมายเชิงปริมาณและเชิงคุณภาพเชิงลึกจากชื่อหรือคำอธิบาย"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>สกัดเป้าหมายเชิงลึก</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoCleanAndTidy}
                  disabled={parsedItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer disabled:opacity-50"
                  title="ตัดเลขข้อ 1. 2. ทำความสะอาดช่องว่าง และจัดรูปแบบชื่อโครงการ"
                >
                  <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>จัดระเบียบข้อมูล</span>
                </button>

                <button
                  type="button"
                  onClick={handleFillDefaultQuantityTargets}
                  disabled={parsedItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer disabled:opacity-50"
                  title="ใส่เป้าหมายเชิงปริมาณ 100% ให้โครงการที่ยังไม่ได้ระบุ"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>เติมเป้าหมาย 100%</span>
                </button>

                <button
                  type="button"
                  onClick={handleFillStandardQualityDesc}
                  disabled={parsedItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer disabled:opacity-50"
                  title="ใส่คำอธิบายเป้าหมายเชิงคุณภาพมาตรฐานให้แถวที่ยังว่าง"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>เติมเป้าหมายคุณภาพ</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddBlankRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>เพิ่มแถวใหม่</span>
                </button>
              </div>
            </div>

            {/* Table View with Dedicated Target Quantity (%) and Target Quality Description Columns */}
            {displayedGridItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">ยังไม่มีข้อมูลโครงการที่ประมวลผล</p>
                <p className="text-xs text-slate-400 mt-1">
                  วางข้อความในช่องด้านบน หรือกดปุ่ม "ตัวอย่างข้อมูล" เพื่อทดสอบระบบจัดเรียง
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                      <th className="py-2.5 px-3 font-bold min-w-[230px]">ชื่อโครงการ <span className="text-rose-500">*</span></th>
                      <th className="py-2.5 px-3 font-bold min-w-[140px]">ผู้รับผิดชอบ</th>
                      <th className="py-2.5 px-3 font-bold min-w-[160px]">ยุทธศาสตร์</th>
                      <th className="py-2.5 px-3 font-bold w-24 text-right">งบประมาณ</th>
                      <th className="py-2.5 px-2.5 font-bold w-28 text-center bg-indigo-50/50 text-indigo-900 border-x border-indigo-100">
                        เป้าหมายเชิงปริมาณ (ร้อยละ %)
                      </th>
                      <th className="py-2.5 px-3 font-bold min-w-[260px] bg-blue-50/40 text-blue-950">
                        เป้าหมายเชิงคุณภาพ (คำอธิบาย)
                      </th>
                      <th className="py-2.5 px-3 font-bold min-w-[140px]">สถานะ</th>
                      <th className="py-2.5 px-2 w-20 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedGridItems.map((item, originalIndex) => {
                      const realIndex = parsedItems.findIndex((p) => p.id === item.id);
                      const idx = realIndex >= 0 ? realIndex : originalIndex;
                      const hasNameError = !item.name || item.name.trim().length < 2;

                      return (
                        <tr
                          key={item.id || idx}
                          className={`transition ${hasNameError ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80'}`}
                        >
                          {/* Row number */}
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-semibold">
                            {idx + 1}
                          </td>

                          {/* Project Name */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                              placeholder="ระบุชื่อโครงการ..."
                              className={`w-full px-2.5 py-1.5 rounded-md border text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:border-indigo-500 ${
                                hasNameError ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                              }`}
                              required
                            />
                            {hasNameError && (
                              <span className="text-[10px] text-rose-500 font-semibold block mt-0.5">
                                * จำเป็นต้องระบุชื่อโครงการ
                              </span>
                            )}
                          </td>

                          {/* Responsible Person */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.responsiblePerson || ''}
                              onChange={(e) => handleUpdateItem(idx, 'responsiblePerson', e.target.value)}
                              placeholder="ผู้รับผิดชอบ"
                              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-800 bg-white text-xs focus:outline-hidden focus:border-indigo-500"
                            />
                          </td>

                          {/* Strategy */}
                          <td className="py-2 px-3">
                            <select
                              value={item.strategy || strategy}
                              onChange={(e) => handleUpdateItem(idx, 'strategy', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-slate-800 bg-white text-xs focus:outline-hidden focus:border-indigo-500 truncate cursor-pointer"
                            >
                              {STRATEGIES.map((s) => (
                                <option key={s} value={s}>
                                  {s.substring(0, 30)}...
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Budget */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              value={item.budget || 0}
                              onChange={(e) => handleUpdateItem(idx, 'budget', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1.5 rounded-md border border-slate-200 text-right font-mono font-semibold text-slate-800 bg-white text-xs focus:outline-hidden focus:border-indigo-500"
                            />
                          </td>

                          {/* Target Quantity % (Explicit Column) */}
                          <td className="py-2 px-2.5 text-center bg-indigo-50/20 border-x border-indigo-100">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[11px] text-indigo-700 font-bold">ร้อยละ</span>
                              <input
                                type="text"
                                value={item.targetQuantityPercent ?? 100}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'targetQuantityPercent', e.target.value)
                                }
                                placeholder="100 หรือ 88.86"
                                className="w-16 px-1.5 py-1.5 rounded-md border border-indigo-200 text-center font-bold text-indigo-900 bg-white text-xs focus:outline-hidden focus:border-indigo-500"
                              />
                              <span className="text-[11px] text-indigo-700 font-bold">%</span>
                            </div>
                          </td>

                          {/* Target Quality Description (Explicit Column) */}
                          <td className="py-2 px-3 bg-blue-50/20">
                            <div className="relative">
                              <input
                                type="text"
                                value={item.targetQualityDesc || ''}
                                onChange={(e) => handleUpdateItem(idx, 'targetQualityDesc', e.target.value)}
                                placeholder="คำอธิบายเป้าหมายเชิงคุณภาพ (เช่น บรรลุตามวัตถุประสงค์...)"
                                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-800 bg-white text-xs focus:outline-hidden focus:border-indigo-500 truncate"
                                title={item.targetQualityDesc}
                              />
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3">
                            <select
                              value={item.status || '6. ยังไม่ดำเนินการ'}
                              onChange={(e) => handleUpdateItem(idx, 'status', e.target.value as ProjectStatus)}
                              className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-slate-800 bg-white text-xs truncate cursor-pointer"
                            >
                              {PROJECT_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Row Actions */}
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingItemIndex(idx)}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                title="ดู/แก้ไขข้อมูลเชิงลึก (เป้าหมายเชิงคุณภาพและผลการดำเนินงาน)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateRow(idx)}
                                className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                title="คัดลอกแถวนี้"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="ลบแถวนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Action Footer Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              {parsedItems.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    พร้อมนำเข้า <strong>{readyCount}</strong> โครงการ (จากทั้งหมด {totalCount} รายการ)
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-indigo-700 font-bold">
                    เป้าหมายเชิงปริมาณ {liveStats.withQuantity} รายการ
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-blue-700 font-bold">
                    เป้าหมายเชิงคุณภาพ {liveStats.withQuality} รายการ
                  </span>
                  {totalBudget > 0 && (
                    <span className="text-slate-500">· รวมงบ {totalBudget.toLocaleString('th-TH')} บาท</span>
                  )}
                </div>
              ) : (
                <span>กรุณาระบุโครงการก่อนกดนำเข้า</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={parsedItems.length === 0 || readyCount === 0 || isSubmitting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                id="btn-confirm-bulk-import"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังนำเข้าและซิงก์ข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <span>จัดเรียงและนำเข้าข้อมูล ({readyCount} โครงการ)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Detailed Row Edit Drawer/Modal */}
        {editingItemIndex !== null && parsedItems[editingItemIndex] && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setEditingItemIndex(null)}
          >
            <div
              className="bg-white rounded-xl max-w-xl w-full p-6 shadow-saas-lg border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    #{editingItemIndex + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      แก้ไขข้อมูลรายละเอียดโครงการเชิงลึก
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      ตรวจสอบและปรับแก้เป้าหมายเชิงปริมาณและเชิงคุณภาพ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItemIndex(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อโครงการ</label>
                  <input
                    type="text"
                    value={parsedItems[editingItemIndex].name}
                    onChange={(e) => handleUpdateItem(editingItemIndex, 'name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-900 bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ผู้รับผิดชอบ</label>
                    <input
                      type="text"
                      value={parsedItems[editingItemIndex].responsiblePerson || ''}
                      onChange={(e) => handleUpdateItem(editingItemIndex, 'responsiblePerson', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">งบประมาณ (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={parsedItems[editingItemIndex].budget || 0}
                      onChange={(e) => handleUpdateItem(editingItemIndex, 'budget', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* TARGET SECTION (Quantity & Quality) */}
                <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ข้อมูลเป้าหมายโครงการ (Project Targets)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เป้าหมายเชิงปริมาณ (ร้อยละ %)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={parsedItems[editingItemIndex].targetQuantityPercent ?? 100}
                        onChange={(e) => handleUpdateItem(editingItemIndex, 'targetQuantityPercent', e.target.value)}
                        placeholder="เช่น 100, 88.86 หรือ ร้อยละ 100"
                        className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-indigo-700 bg-white text-center focus:outline-hidden focus:border-indigo-500 text-sm"
                      />
                      <span className="text-xs text-indigo-700 font-bold">
                        (คำนวณได้: {parseFlexiblePercentage(parsedItems[editingItemIndex].targetQuantityPercent ?? 100)}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เป้าหมายเชิงคุณภาพ (คำอธิบาย / วัตถุประสงค์)
                    </label>
                    <textarea
                      rows={3}
                      value={parsedItems[editingItemIndex].targetQualityDesc || ''}
                      onChange={(e) => handleUpdateItem(editingItemIndex, 'targetQualityDesc', e.target.value)}
                      placeholder="เช่น ดำเนินการบรรลุตามวัตถุประสงค์และมาตรฐานการศึกษาที่กำหนด"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 bg-white leading-relaxed focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* RESULT SECTION (Actual Quantity & Quality) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ข้อมูลผลการดำเนินงาน (Actual Results)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ผลการดำเนินงานเชิงปริมาณ (ร้อยละ %)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={parsedItems[editingItemIndex].resultQuantityPercent ?? 0}
                        onChange={(e) => handleUpdateItem(editingItemIndex, 'resultQuantityPercent', e.target.value)}
                        placeholder="เช่น 88.86, 95.5 หรือ ร้อยละ 88.86"
                        className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-emerald-700 bg-white text-center focus:outline-hidden focus:border-emerald-500 text-sm"
                      />
                      <span className="text-xs text-emerald-700 font-bold">
                        (คำนวณได้: {parseFlexiblePercentage(parsedItems[editingItemIndex].resultQuantityPercent ?? 0)}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ผลการดำเนินงานเชิงคุณภาพ (คำอธิบายสรุปผลสำเร็จ)
                    </label>
                    <textarea
                      rows={3}
                      value={parsedItems[editingItemIndex].resultQualityDesc || ''}
                      onChange={(e) => handleUpdateItem(editingItemIndex, 'resultQualityDesc', e.target.value)}
                      placeholder="เช่น อยู่ระหว่างเตรียมการ หรือ ดำเนินการบรรลุตามเป้าหมาย"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 bg-white leading-relaxed focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItemIndex(null)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs transition"
                >
                  บันทึกและปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
