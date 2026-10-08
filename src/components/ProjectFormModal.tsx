import React, { useState, useEffect } from 'react';
import {
  ProjectItem,
  EducationLevel,
  ProjectStatus,
  PROJECT_STATUSES,
  STRATEGIES,
  EARLY_CHILDHOOD_STANDARDS,
  BASIC_EDUCATION_STANDARDS,
  MINISTRY_POLICIES,
  NATIONAL_EDUCATION_OUTCOMES,
  BASIC_COMPETENCIES,
  CORE_COMPETENCIES,
  CHILD_DEVELOPMENTS,
  VERIFIER_OPTIONS,
  EDUCATION_LEVEL_NAMES,
} from '../types';
import { useProjectStore } from '../context/ProjectContext';
import { parseFlexiblePercentage, formatAutoDecimalPercentage } from '../utils/percentageHelper';
import { Alert } from './Alert';
import { SpinnerOverlay } from './Spinner';
import { X, Save, AlertCircle, Lock } from 'lucide-react';

interface ProjectFormModalProps {
  project?: ProjectItem | null; // If provided, edit mode; if null, create mode
  defaultLevel?: EducationLevel;
  onClose: () => void;
  onSaved?: (savedProject: ProjectItem) => void;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  project,
  defaultLevel = 'basic_education',
  onClose,
  onSaved,
}) => {
  const { addProject, updateProject, currentLevel, selectedYear, isAdmin } =
    useProjectStore();

  const isEditMode = !!project;

  // Form states
  const [name, setName] = useState(project?.name || '');
  const [level, setLevel] = useState<EducationLevel>(
    project?.level || currentLevel || defaultLevel
  );
  const [academicYear, setAcademicYear] = useState<number>(
    project?.academicYear || selectedYear || 2568
  );
  const [strategy, setStrategy] = useState<string>(
    project?.strategy || STRATEGIES[0]
  );
  const [targetQuantityInput, setTargetQuantityInput] = useState<string>(
    project?.targetQuantityPercent !== undefined && project?.targetQuantityPercent !== null
      ? String(project.targetQuantityPercent)
      : '100'
  );
  const [targetQualityDesc, setTargetQualityDesc] = useState(
    project?.targetQualityDesc || ''
  );
  const [resultQuantityInput, setResultQuantityInput] = useState<string>(
    project?.resultQuantityPercent !== undefined && project?.resultQuantityPercent !== null
      ? String(project.resultQuantityPercent)
      : '0'
  );
  const [resultQualityDesc, setResultQualityDesc] = useState(
    project?.resultQualityDesc || ''
  );

  const [standards, setStandards] = useState<string[]>(
    project?.standards || [
      level === 'early_childhood'
        ? EARLY_CHILDHOOD_STANDARDS[0]
        : BASIC_EDUCATION_STANDARDS[0],
    ]
  );
  const [ministryPolicies, setMinistryPolicies] = useState<string[]>(
    project?.ministryPolicies || [MINISTRY_POLICIES[1]]
  );
  const [nationalOutcomes, setNationalOutcomes] = useState<string[]>(
    project?.nationalOutcomes || [NATIONAL_EDUCATION_OUTCOMES[0]]
  );
  const [basicCompetencies, setBasicCompetencies] = useState<string[]>(
    project?.basicCompetencies || []
  );
  const [coreCompetencies, setCoreCompetencies] = useState<string[]>(
    project?.coreCompetencies || []
  );
  const [childDevelopment, setChildDevelopment] = useState<string[]>(
    project?.childDevelopment || []
  );

  const [responsiblePerson, setResponsiblePerson] = useState(
    project?.responsiblePerson || ''
  );
  const [verifier, setVerifier] = useState<string>(
    project?.verifier || VERIFIER_OPTIONS[1]
  );
  const [customVerifier, setCustomVerifier] = useState(
    project?.customVerifier || ''
  );
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status || '6. ยังไม่ดำเนินการ'
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when project prop changes
  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setLevel(project.level || currentLevel || defaultLevel);
      setAcademicYear(project.academicYear || selectedYear || 2568);
      setStrategy(project.strategy || STRATEGIES[0]);
      setTargetQuantityInput(
        project.targetQuantityPercent !== undefined && project.targetQuantityPercent !== null
          ? String(project.targetQuantityPercent)
          : '100'
      );
      setTargetQualityDesc(project.targetQualityDesc || '');
      setResultQuantityInput(
        project.resultQuantityPercent !== undefined && project.resultQuantityPercent !== null
          ? String(project.resultQuantityPercent)
          : '0'
      );
      setResultQualityDesc(project.resultQualityDesc || '');
      setStandards(project.standards || []);
      setResponsiblePerson(project.responsiblePerson || '');
      setVerifier(project.verifier || VERIFIER_OPTIONS[1]);
      setCustomVerifier(project.customVerifier || '');
      setStatus(project.status || '6. ยังไม่ดำเนินการ');
      setMinistryPolicies(project.ministryPolicies || [MINISTRY_POLICIES[1]]);
      setNationalOutcomes(project.nationalOutcomes || [NATIONAL_EDUCATION_OUTCOMES[0]]);
      setBasicCompetencies(project.basicCompetencies || []);
      setCoreCompetencies(project.coreCompetencies || []);
      setChildDevelopment(project.childDevelopment || []);
    } else {
      setLevel(currentLevel || defaultLevel);
      setAcademicYear(selectedYear || 2568);
      setStandards([
        (currentLevel || defaultLevel) === 'early_childhood'
          ? EARLY_CHILDHOOD_STANDARDS[0]
          : BASIC_EDUCATION_STANDARDS[0],
      ]);
    }
  }, [project, currentLevel, defaultLevel, selectedYear]);

  // Handler for user changing education level
  const handleLevelChange = (newLevel: EducationLevel) => {
    setLevel(newLevel);
    // Automatically adjust default standard if current standard belongs to different level
    if (newLevel === 'early_childhood') {
      const hasEarlyStandard = standards.some((s) => (EARLY_CHILDHOOD_STANDARDS as readonly string[]).includes(s));
      if (!hasEarlyStandard) {
        setStandards([EARLY_CHILDHOOD_STANDARDS[0]]);
      }
    } else {
      const hasBasicStandard = standards.some((s) => (BASIC_EDUCATION_STANDARDS as readonly string[]).includes(s));
      if (!hasBasicStandard) {
        setStandards([BASIC_EDUCATION_STANDARDS[0]]);
      }
    }
  };

  const toggleArrayItem = (item: string, currentList: string[], setList: (items: string[]) => void) => {
    if (currentList.includes(item)) {
      setList(currentList.filter((i) => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  const toggleExclusiveItem = (
    item: string,
    exclusiveItem: string,
    currentList: string[],
    setList: (items: string[]) => void
  ) => {
    if (item === exclusiveItem) {
      setList(currentList.includes(exclusiveItem) ? [] : [exclusiveItem]);
    } else {
      const withoutExclusive = currentList.filter((i) => i !== exclusiveItem);
      if (withoutExclusive.includes(item)) {
        setList(withoutExclusive.filter((i) => i !== item));
      } else {
        setList([...withoutExclusive, item]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('กรุณากรอกชื่อโครงการ / แนวทาง');
      return;
    }

    if (!isEditMode && !isAdmin) {
      setErrorMsg('เฉพาะแอดมินเท่านั้นที่สามารถเพิ่มโครงการใหม่ได้');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && project) {
        const updateData: Partial<ProjectItem> = {
          name: name.trim(),
          level,
          academicYear,
          strategy,
          targetQuantityPercent: parseFlexiblePercentage(targetQuantityInput, 100),
          targetQualityDesc: targetQualityDesc.trim(),
          resultQuantityPercent: parseFlexiblePercentage(resultQuantityInput, 0),
          resultQualityDesc: resultQualityDesc.trim(),
          standards,
          ministryPolicies,
          nationalOutcomes,
          basicCompetencies: level === 'basic_education' ? basicCompetencies : [],
          coreCompetencies: level === 'basic_education' ? coreCompetencies : [],
          childDevelopment: level === 'early_childhood' ? childDevelopment : [],
          responsiblePerson: responsiblePerson.trim(),
          ...(isAdmin
            ? {
                verifier,
                customVerifier: verifier === 'อื่น ๆ' ? customVerifier.trim() : undefined,
              }
            : {}),
          status,
        };

        const res = await updateProject(project.id, updateData);
        if (!res.success) {
          setErrorMsg(res.message || 'ไม่สามารถบันทึกข้อมูลได้');
          setIsSubmitting(false);
          return;
        }

        if (onSaved) {
          onSaved({
            ...project,
            ...updateData,
          } as ProjectItem);
        }
      } else {
        // Create new project (Admin)
        const newProjectData: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt' | 'attachments'> = {
          name: name.trim(),
          level,
          academicYear,
          strategy,
          targetQuantityPercent: parseFlexiblePercentage(targetQuantityInput, 100),
          targetQualityDesc: targetQualityDesc.trim(),
          resultQuantityPercent: parseFlexiblePercentage(resultQuantityInput, 0),
          resultQualityDesc: resultQualityDesc.trim(),
          standards,
          ministryPolicies,
          nationalOutcomes,
          basicCompetencies: level === 'basic_education' ? basicCompetencies : [],
          coreCompetencies: level === 'basic_education' ? coreCompetencies : [],
          childDevelopment: level === 'early_childhood' ? childDevelopment : [],
          responsiblePerson: responsiblePerson.trim() || 'ผู้รับผิดชอบโครงการ',
          verifier,
          customVerifier: verifier === 'อื่น ๆ' ? customVerifier.trim() : undefined,
          status,
        };

        const res = await addProject(newProjectData);
        if (!res.success) {
          setErrorMsg(res.message || 'ไม่สามารถเพิ่มโครงการได้');
          setIsSubmitting(false);
          return;
        }
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStandardsList =
    level === 'early_childhood' ? EARLY_CHILDHOOD_STANDARDS : BASIC_EDUCATION_STANDARDS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-saas border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEditMode ? 'แก้ไขข้อมูลและรายงานผลโครงการ' : 'เพิ่มโครงการใหม่'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode
                ? 'อัปเดตผลสำเร็จและข้อมูลรายละเอียดโครงการ'
                : 'กรอกข้อมูลรายละเอียดโครงการและรายงานผลสัมฤทธิ์'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center border border-slate-200 transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="relative p-6 overflow-y-auto space-y-6 text-sm">
          {/* Spinner Overlay when saving project */}
          <SpinnerOverlay
            isLoading={isSubmitting}
            type="dotted-round"
            size="xxl"
            message={isEditMode ? 'กำลังบันทึกข้อมูลโครงการ...' : 'กำลังสร้างโครงการใหม่...'}
            subMessage="ระบบกำลังตรวจสอบและบันทึกข้อมูลอย่างปลอดภัย"
          />

          {errorMsg && (
            <Alert
              variant="error"
              title="ไม่สามารถบันทึกข้อมูลได้"
              onClose={() => setErrorMsg(null)}
            >
              {errorMsg}
            </Alert>
          )}

          {/* Level & Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ระดับการศึกษา <span className="text-rose-500">*</span>
              </label>
              <select
                value={level}
                onChange={(e) => handleLevelChange(e.target.value as EducationLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="early_childhood">ระดับการศึกษาปฐมวัย</option>
                <option value="basic_education">ระดับการศึกษาขั้นพื้นฐาน</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ปีการศึกษา (พ.ศ.) <span className="text-rose-500">*</span>
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-white font-medium cursor-pointer"
                required
              >
                {[2572, 2571, 2570, 2569, 2568, 2567, 2566].map((yr) => (
                  <option key={yr} value={yr}>
                    ปีการศึกษา {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              ยุทธศาสตร์โรงเรียน <span className="text-rose-500">*</span>
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-white"
            >
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              ชื่อโครงการ / แนวทาง <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ระบุชื่อโครงการ เช่น โครงการพัฒนาคุณภาพเด็กบนพื้นฐานของคริสตจริยธรรม"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-white"
              required
            />
          </div>

          {/* Status */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                สถานะการดำเนินโครงการ <span className="text-rose-500">*</span>
              </label>
              {!isAdmin && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  🔒 แอดมินกำหนดได้เท่านั้น
                </span>
              )}
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              disabled={!isAdmin}
              className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium ${
                !isAdmin ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-white'
              }`}
            >
              {PROJECT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Target: Quantity & Quality */}
          <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                🎯 ข้อมูลเป้าหมาย (Target)
              </div>
              {!isAdmin && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  🔒 เฉพาะแอดมินแก้ไขเป้าหมาย
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  เป้าหมาย ปริมาณ (ร้อยละ)
                </label>
                <input
                  type="text"
                  value={targetQuantityInput}
                  onChange={(e) => setTargetQuantityInput(e.target.value)}
                  onBlur={() => {
                    if (targetQuantityInput.trim()) {
                      setTargetQuantityInput(formatAutoDecimalPercentage(targetQuantityInput));
                    }
                  }}
                  disabled={!isAdmin}
                  className={`w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 text-sm font-semibold ${
                    !isAdmin ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-white text-slate-800'
                  }`}
                  placeholder="เช่น 100 หรือ ร้อยละ 100"
                />
                <div className="text-[11px] text-indigo-700 font-medium mt-1">
                  คำนวณได้: <strong>ร้อยละ {parseFlexiblePercentage(targetQuantityInput, 100)}%</strong>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  เป้าหมาย คุณภาพ (อธิบาย)
                </label>
                <input
                  type="text"
                  value={targetQualityDesc}
                  onChange={(e) => setTargetQualityDesc(e.target.value)}
                  disabled={!isAdmin}
                  className={`w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 text-sm ${
                    !isAdmin ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-white'
                  }`}
                  placeholder="อธิบายเป้าหมายเชิงคุณภาพของโครงการ"
                />
              </div>
            </div>
          </div>

          {/* Actual Result: Quantity & Quality */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-3">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              🏆 ข้อมูลผลสำเร็จ / รายงานผล (Actual Result)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  ผลสำเร็จ ปริมาณ (ร้อยละ)
                </label>
                <input
                  type="text"
                  value={resultQuantityInput}
                  onChange={(e) => setResultQuantityInput(e.target.value)}
                  onBlur={() => {
                    if (resultQuantityInput.trim()) {
                      setResultQuantityInput(formatAutoDecimalPercentage(resultQuantityInput));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 focus:outline-hidden focus:border-emerald-600 text-sm font-bold bg-white text-emerald-950"
                  placeholder="เช่น 88.86, 95.5 หรือ ร้อยละ 88.86"
                />
                <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium mt-1">
                  <span>คำนวณได้: <strong>ร้อยละ {parseFlexiblePercentage(resultQuantityInput, 0)}%</strong></span>
                  <span className="text-slate-500">รองรับเลขทศนิยม</span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  ผลสำเร็จ คุณภาพ (อธิบาย)
                </label>
                <input
                  type="text"
                  value={resultQualityDesc}
                  onChange={(e) => setResultQualityDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-600 text-sm bg-white"
                  placeholder="อธิบายผลสำเร็จและข้อสังเกตเชิงคุณภาพ"
                />
              </div>
            </div>
          </div>

          {/* Standards (Multi-select checkboxes) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              มาตรฐานระดับการศึกษา ({EDUCATION_LEVEL_NAMES[level]}) (เลือกได้มากกว่า 1 ข้อ)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {currentStandardsList.map((std) => {
                const checked = standards.includes(std);
                return (
                  <label
                    key={std}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                      checked
                        ? 'bg-indigo-50/80 border-indigo-500 text-slate-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem(std, standards, setStandards)}
                      className="accent-indigo-600 w-4 h-4 rounded-md"
                    />
                    <span>{std}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Ministry Policies (Multi-select checkboxes) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              นโยบายจุดเน้นกระทรวงศึกษาธิการ (เลือกได้มากกว่า 1 ข้อ)
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {MINISTRY_POLICIES.map((pol) => {
                const checked = ministryPolicies.includes(pol);
                return (
                  <label
                    key={pol}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer text-xs transition ${
                      checked
                        ? 'bg-indigo-50/70 border-indigo-400 text-slate-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem(pol, ministryPolicies, setMinistryPolicies)}
                      className="accent-indigo-600 w-4 h-4 rounded-md"
                    />
                    <span>{pol}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* National Education Outcomes (Multi-select checkboxes) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              ผลลัพธ์ที่พึงประสงค์ของมาตรฐานการศึกษาชาติ (เลือกได้มากกว่า 1 ข้อ)
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {NATIONAL_EDUCATION_OUTCOMES.map((outc) => {
                const checked = nationalOutcomes.includes(outc);
                return (
                  <label
                    key={outc}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer text-xs transition ${
                      checked
                        ? 'bg-indigo-50/70 border-indigo-400 text-slate-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem(outc, nationalOutcomes, setNationalOutcomes)}
                      className="accent-indigo-600 w-4 h-4 rounded-md"
                    />
                    <span>{outc}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Competencies (Basic Education) or Child Development (Early Childhood) */}
          {level === 'basic_education' ? (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                สมรรถนะระดับการศึกษาขั้นพื้นฐาน (เลือกได้มากกว่า 1 ข้อ)
              </div>

              {/* สมรรถนะพื้นฐาน */}
              <div>
                <label className="block text-xs font-bold text-amber-950 mb-1.5">
                  สมรรถนะพื้นฐาน
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BASIC_COMPETENCIES.map((bc) => {
                    const checked = basicCompetencies.includes(bc);
                    return (
                      <label
                        key={bc}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition ${
                          checked
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                            : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleExclusiveItem(bc, 'ไม่มี', basicCompetencies, setBasicCompetencies)
                          }
                          className="accent-amber-600 w-4 h-4 rounded-md"
                        />
                        <span>{bc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* สมรรถนะหลัก */}
              <div className="pt-2 border-t border-amber-200">
                <label className="block text-xs font-bold text-amber-950 mb-1.5">
                  สมรรถนะหลัก
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CORE_COMPETENCIES.map((cc) => {
                    const checked = coreCompetencies.includes(cc);
                    return (
                      <label
                        key={cc}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition ${
                          checked
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                            : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleExclusiveItem(cc, 'ไม่มี', coreCompetencies, setCoreCompetencies)
                          }
                          className="accent-amber-600 w-4 h-4 rounded-md"
                        />
                        <span>{cc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
              <label className="block text-xs font-bold text-teal-950 uppercase tracking-wide">
                พัฒนาการเด็ก (ระดับการศึกษาปฐมวัย - เลือกได้มากกว่า 1 ข้อ)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CHILD_DEVELOPMENTS.map((cd) => {
                  const checked = childDevelopment.includes(cd);
                  return (
                    <label
                      key={cd}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition ${
                        checked
                          ? 'bg-teal-100 border-teal-400 text-teal-950 font-bold'
                          : 'bg-white border-teal-200 text-slate-700 hover:bg-teal-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleExclusiveItem(cd, 'ไม่มี', childDevelopment, setChildDevelopment)
                        }
                        className="accent-teal-600 w-4 h-4 rounded-md"
                      />
                      <span>{cd}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Responsible & Verifier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ผู้รับผิดชอบโครงการ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="ระบุชื่อผู้รับผิดชอบ หรือกลุ่มสาระ/ฝ่าย"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 text-sm bg-white"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  ผู้ตรวจสอบความถูกต้องโครงการ/กิจกรรม <span className="text-rose-500">*</span>
                </label>
                {!isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    <Lock className="w-3 h-3 text-amber-600" />
                    เฉพาะแอดมินเป็นผู้กรอก
                  </span>
                )}
              </div>
              {isAdmin ? (
                <>
                  <select
                    value={verifier}
                    onChange={(e) => setVerifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 text-sm bg-white"
                  >
                    {VERIFIER_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {verifier === 'อื่น ๆ' && (
                    <input
                      type="text"
                      value={customVerifier}
                      onChange={(e) => setCustomVerifier(e.target.value)}
                      placeholder="ระบุฝ่ายหรือผู้ตรวจสอบอื่น ๆ"
                      className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 text-sm bg-white"
                      required
                    />
                  )}
                </>
              ) : (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-between">
                  <span>
                    {verifier === 'อื่น ๆ' && customVerifier
                      ? `${verifier} (${customVerifier})`
                      : verifier || 'ฝ่ายนโยบายและแผนงาน'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">กำหนดโดย Admin</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'กำลังบันทึก...'
                  : isEditMode
                  ? 'บันทึกรายงานผล / ข้อมูลโครงการ'
                  : 'บันทึกข้อมูลโครงการ'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
