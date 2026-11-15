import { useLocation, useNavigate, useParams as useRouterParams, useSearchParams as useRouterSearchParams, } from 'react-router-dom';
export function useRouter() {
    const navigate = useNavigate();
    return {
        push: (href) => navigate(href),
        replace: (href) => navigate(href, { replace: true }),
        refresh: () => { },
        back: () => navigate(-1),
        forward: () => navigate(1),
        prefetch: () => { },
    };
}
export function usePathname() {
    const location = useLocation();
    return location.pathname;
}
export function useParams() {
    return useRouterParams();
}
export function useSearchParams() {
    const [searchParams] = useRouterSearchParams();
    return searchParams;
}
export function notFound() {
    throw new Error('NOT_FOUND');
}
