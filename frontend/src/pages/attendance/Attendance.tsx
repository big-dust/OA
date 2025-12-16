import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { attendanceService } from '@/services/attendance';
import type { Attendance } from '@/types';

// 格式化时间显示
function formatTime(timeStr: string | null): string {
  if (!timeStr) return '-';
  const date = new Date(timeStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// 格式化日期显示
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// 获取当前月份字符串 (YYYY-MM)
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 获取星期几
function getDayOfWeek(dateStr: string): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

export default function AttendancePage() {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [monthlyRecords, setMonthlyRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // 加载今日考勤状态
  const fetchTodayAttendance = useCallback(async () => {
    try {
      const data = await attendanceService.getToday();
      setTodayAttendance(data);
    } catch {
      // 今日无考勤记录时可能返回 null 或 404
      setTodayAttendance(null);
    }
  }, []);

  // 加载当月考勤记录
  const fetchMonthlyRecords = useCallback(async () => {
    try {
      const data = await attendanceService.getList(getCurrentMonth());
      setMonthlyRecords(data);
    } catch {
      toast.error('获取考勤记录失败');
    }
  }, []);


  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTodayAttendance(), fetchMonthlyRecords()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchTodayAttendance, fetchMonthlyRecords]);

  // 签到
  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const data = await attendanceService.signIn();
      setTodayAttendance(data);
      await fetchMonthlyRecords();
      toast.success('签到成功');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '签到失败';
      toast.error(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  // 签退
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const data = await attendanceService.signOut();
      setTodayAttendance(data);
      await fetchMonthlyRecords();
      toast.success('签退成功');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '签退失败';
      toast.error(message);
    } finally {
      setIsSigningOut(false);
    }
  };

  // 判断是否已签到
  const hasSignedIn = todayAttendance?.sign_in_time !== null && todayAttendance?.sign_in_time !== undefined;
  // 判断是否已签退
  const hasSignedOut = todayAttendance?.sign_out_time !== null && todayAttendance?.sign_out_time !== undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 今日考勤状态卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle>今日考勤</CardTitle>
          </div>
          <CardDescription>
            {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 签到状态 */}
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <LogIn className="w-8 h-8 text-green-600 mb-2" />
              <span className="text-sm text-muted-foreground mb-1">签到时间</span>
              <span className="text-lg font-semibold">
                {hasSignedIn ? formatTime(todayAttendance!.sign_in_time) : '-'}
              </span>
              {hasSignedIn && (
                <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
                  已签到
                </Badge>
              )}
            </div>

            {/* 签退状态 */}
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <LogOut className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-sm text-muted-foreground mb-1">签退时间</span>
              <span className="text-lg font-semibold">
                {hasSignedOut ? formatTime(todayAttendance!.sign_out_time) : '-'}
              </span>
              {hasSignedOut && (
                <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-700">
                  已签退
                </Badge>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col items-center justify-center p-4">
              {!hasSignedIn ? (
                <Button 
                  size="lg" 
                  className="w-full max-w-[200px]"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  {isSigningIn ? '签到中...' : '签到'}
                </Button>
              ) : !hasSignedOut ? (
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full max-w-[200px]"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  {isSigningOut ? '签退中...' : '签退'}
                </Button>
              ) : (
                <div className="text-center">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-base px-4 py-2">
                    今日考勤已完成
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


      {/* 当月考勤记录 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle>当月考勤记录</CardTitle>
          </div>
          <CardDescription>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              本月暂无考勤记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>星期</TableHead>
                    <TableHead>签到时间</TableHead>
                    <TableHead>签退时间</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRecords.map((record) => {
                    const signedIn = record.sign_in_time !== null;
                    const signedOut = record.sign_out_time !== null;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>{getDayOfWeek(record.date)}</TableCell>
                        <TableCell>{formatTime(record.sign_in_time)}</TableCell>
                        <TableCell>{formatTime(record.sign_out_time)}</TableCell>
                        <TableCell>
                          {signedIn && signedOut ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              正常
                            </Badge>
                          ) : signedIn ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                              未签退
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              缺勤
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
