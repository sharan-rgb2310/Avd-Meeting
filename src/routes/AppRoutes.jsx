import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import ProtectedRoute, { PublicOnlyRoute } from './ProtectedRoute'

const Login = lazy(() => import('../pages/Login'))
const SignUp = lazy(() => import('../pages/SignUp'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Companies = lazy(() => import('../pages/Companies'))
const CompanyDetails = lazy(() => import('../pages/CompanyDetails'))
const Meetings = lazy(() => import('../pages/Meetings'))
const CreateMeeting = lazy(() => import('../pages/CreateMeeting'))
const MeetingDetails = lazy(() => import('../pages/MeetingDetails'))
const EditMeeting = lazy(() => import('../pages/EditMeeting'))
const ActionItems = lazy(() => import('../pages/ActionItems'))
const Documents = lazy(() => import('../pages/Documents'))
const Teams = lazy(() => import('../pages/Teams'))
const TeamDetails = lazy(() => import('../pages/TeamDetails'))
const UsersPage = lazy(() => import('../pages/Users'))
const Notifications = lazy(() => import('../pages/Notifications'))
const Authentication = lazy(() => import('../pages/Authentication'))
const Profile = lazy(() => import('../pages/Profile'))
const NotFound = lazy(() => import('../pages/NotFound'))

const AppRoutes = () => (
  <Suspense fallback={<div className="min-h-screen bg-canvas" aria-busy="true" />}>
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignUp />
          </PublicOnlyRoute>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetails />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/meetings/create" element={<CreateMeeting />} />
          <Route path="/meetings/:id" element={<MeetingDetails />} />
          <Route path="/meetings/:id/edit" element={<EditMeeting />} />
          <Route path="/action-items" element={<ActionItems />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetails />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/authentication" element={<Authentication />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
)

export default AppRoutes
